from asyncio.log import logger
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import numpy as np
import json
import logging
logger = logging.getLogger(__name__)
from ..database import get_db
from ..core.algorithms import (
    nearest_neighbor, delaunay_interpolation, allen_match
)
from ..core.colormath import srgb_to_xyz, xyz_to_lab

router = APIRouter(prefix="/match", tags=["matching"])


class RGBInput(BaseModel):
    R: int  # 0-255
    G: int
    B: int
    method: str = "delaunay"  # "delaunay", "nearest_neighbor", "allen"
    combo_type: int = 2        # 2 or 3 dyes

class XYZInput(BaseModel):
    X: float
    Y: float
    Z: float
    method: str = "delaunay"
    combo_type: int = 2
    force_combo_id: int | None = None  # force specific combination_id

def load_illuminant(db: Session):
    rows = db.execute(text("""
        SELECT wavelength_nm, d65_value, x_bar, y_bar, z_bar
        FROM illuminant_observer
        ORDER BY wavelength_nm
    """)).fetchall()
    D65 = np.array([r.d65_value for r in rows])
    OBS = np.array([[r.x_bar, r.y_bar, r.z_bar] for r in rows])
    return D65, OBS


def load_lut(db: Session, combo_type: int, force_combo_id: int | None = None):
    query = """
        SELECT
            l.combination_id,
            l.conc_1, l.conc_2, l.conc_3,
            l.x, l.y, l.z,
            l.l_star, l.a_star, l.b_star,
            l.sr, l.sg, l.sb
        FROM lut_entry l
        JOIN dye_combination dc ON dc.id = l.combination_id
        WHERE dc.combo_type = :ct
    """
    params = {"ct": combo_type}
    if force_combo_id:
        query += " AND l.combination_id = :cid"
        params["cid"] = force_combo_id
    query += " ORDER BY l.combination_id"
    return db.execute(text(query), params).fetchall()

@router.post("/rgb")
def match_from_rgb(body: RGBInput, db: Session = Depends(get_db)):
    # 1. convert sRGB → XYZ → Lab
    sRGB = np.array([body.R, body.G, body.B])
    XYZ_query = srgb_to_xyz(sRGB)
    D65, OBS = load_illuminant(db)
    XYZ_n = np.array([
        100 * np.sum(D65 * OBS[:, 0]) / np.sum(D65 * OBS[:, 1]),
        100.0,
        100 * np.sum(D65 * OBS[:, 2]) / np.sum(D65 * OBS[:, 1])
    ])
    Lab_query = xyz_to_lab(XYZ_query, XYZ_n)

    # ADD THESE TWO LINES:
    XYZ_total = XYZ_query[0] + XYZ_query[1] + XYZ_query[2]
    query_xy = {
        "x": XYZ_query[0] / XYZ_total if XYZ_total > 0 else 0,
        "y": XYZ_query[1] / XYZ_total if XYZ_total > 0 else 0
    }
    query_ab = {"a": float(Lab_query[1]), "b": float(Lab_query[2])}

    # 2. find best combination automatically
    best = find_best_combination(
        Lab_query, body.combo_type, db, body.method, D65, OBS
    )
    if not best:
        raise HTTPException(404, "No matching combination found")

    # 3. build response
    response_data = {
        "input":            {"R": body.R, "G": body.G, "B": body.B},
        "query_Lab":        Lab_query.tolist(),
        "query_xy":         query_xy,
        "query_ab":         query_ab,
        **best
    }
    # 4. log to history
    try:
        db.execute(text("""
            INSERT INTO matching_session
                (method_used, combo_type, combination_id,
                 input_R, input_G, input_B,
                 query_L, query_a, query_b,
                 delta_e_real, inside_gamut, result_json)
            VALUES
                (:method, :combo_type, :combo_id,
                 :R, :G, :B,
                 :L, :a, :b,
                 :de, :gamut, :result)
        """), {
            "method":     best["method_used"],
            "combo_type": body.combo_type,
            "combo_id":   best["combination_id"],
            "R":          float(body.R),
            "G":          float(body.G),
            "B":          float(body.B),
            "L":          float(Lab_query[0]),
            "a":          float(Lab_query[1]),
            "b":          float(Lab_query[2]),
            "de":         best["delta_e_real"],
            "gamut":      best["inside_gamut"],
            "result":     json.dumps(response_data)
        })
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to log session: {e}")

    return response_data

@router.post("/xyz")
def match_from_xyz(body: XYZInput, db: Session = Depends(get_db)):
    # 1. XYZ → Lab
    D65, OBS = load_illuminant(db)
    XYZ_query = np.array([body.X, body.Y, body.Z])
    XYZ_n = np.array([
        100 * np.sum(D65 * OBS[:, 0]) / np.sum(D65 * OBS[:, 1]),
        100.0,
        100 * np.sum(D65 * OBS[:, 2]) / np.sum(D65 * OBS[:, 1])
    ])
    Lab_query = xyz_to_lab(XYZ_query, XYZ_n)
    XYZ_total = XYZ_query[0] + XYZ_query[1] + XYZ_query[2]
    query_xy = {
        "x": XYZ_query[0] / XYZ_total if XYZ_total > 0 else 0,
        "y": XYZ_query[1] / XYZ_total if XYZ_total > 0 else 0
    }
    query_ab = {"a": float(Lab_query[1]), "b": float(Lab_query[2])}

    # 2. if force_combo_id given use it, otherwise try all combinations
    if body.force_combo_id:
        lut_rows = load_lut(db, body.combo_type, body.force_combo_id)
        if not lut_rows:
            raise HTTPException(404, "No LUT entries found")

        Lab_points = np.array([[r.l_star, r.a_star, r.b_star]
                                for r in lut_rows])
        concentrations = np.array([
            [r.conc_1, r.conc_2] if body.combo_type == 2
            else [r.conc_1, r.conc_2, r.conc_3 or 0.0]
            for r in lut_rows
        ])

        if body.method == "delaunay":
            result = delaunay_interpolation(Lab_query, Lab_points, concentrations)
        else:
            result = nearest_neighbor(Lab_query, Lab_points, concentrations)

        dye_names = db.execute(text("""
            SELECT d.trade_name, d.ci_number, cm.slot_index, cm.dye_id
            FROM combination_member cm
            JOIN dye d ON d.id = cm.dye_id
            WHERE cm.combination_id = :cid
            ORDER BY cm.slot_index
        """), {"cid": body.force_combo_id}).fetchall()

        from ..core.colormath import compute_lab_from_concentrations
        winning_dye_ids = [d.dye_id for d in dye_names]
        KSU = load_ksu(db, winning_dye_ids)
        _, KS_sub = load_substrate(db)
        Lab_produced = compute_lab_from_concentrations(
            result["concentrations"], KSU, KS_sub, D65, OBS
        )
        real_delta_e = float(np.sqrt(np.sum((Lab_query - Lab_produced) ** 2)))

        return {
            "input":            {"X": body.X, "Y": body.Y, "Z": body.Z},
            "query_Lab":        Lab_query.tolist(),
            "combination_id":   body.force_combo_id,
            "method_used":      result["method"],
            "inside_gamut":     result["method"] == "delaunay",
            "produced_Lab":     Lab_produced.tolist(),
            "query_xy":         query_xy,
            "query_ab":         query_ab,
            
            "dyes": [
                {
                    "name":          d.trade_name,
                    "ci_number":     d.ci_number,
                    "concentration": result["concentrations"][d.slot_index]
                }
                for d in dye_names
            ],
            "delta_e_lut":  result.get("distance", 0.0),
            "delta_e_real": real_delta_e
        }

    else:
        # try all combinations, pick best
        best = find_best_combination(
            Lab_query, body.combo_type, db, body.method, D65, OBS
        )
        if not best:
            raise HTTPException(404, "No matching combination found")

        return {
            "input":     {"X": body.X, "Y": body.Y, "Z": body.Z},
            "query_Lab": Lab_query.tolist(),
            "query_xy":  query_xy,
            "query_ab":  query_ab,
            **best
        }


@router.get("/ks-data")
def get_ks_data(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT d.trade_name, kv.concentration, kv.wavelength_nm, kv.ks
        FROM ks_value kv
        JOIN dye d ON d.id = kv.dye_id
        WHERE kv.concentration > 0
        ORDER BY d.id, kv.concentration, kv.wavelength_nm
    """)).fetchall()
    
    result = {}
    for r in rows:
        if r.trade_name not in result:
            result[r.trade_name] = {}
        if r.wavelength_nm not in result[r.trade_name]:
            result[r.trade_name][r.wavelength_nm] = {}
        result[r.trade_name][r.wavelength_nm][r.concentration] = r.ks
    
    return result



class AllenInput(BaseModel):
    X: float
    Y: float
    Z: float
    dye_indices: list[int]  # 1-based, e.g. [1,2] or [2,3,4]


def load_substrate(db: Session):
    rows = db.execute(text("""
        SELECT wavelength_nm, reflectance, ks
        FROM substrate
        ORDER BY wavelength_nm
    """)).fetchall()
    R_sub  = np.array([r.reflectance for r in rows])
    KS_sub = np.array([r.ks         for r in rows])
    return R_sub, KS_sub


def load_ksu(db: Session, dye_ids: list[int]):
    """Load unit k/s matrix for given dye DB ids. Returns (n_dyes, 31)"""
    rows = db.execute(text("""
        SELECT dye_id, wavelength_nm, ks
        FROM ks_value
        WHERE dye_id = ANY(:ids) AND concentration = 0
        ORDER BY dye_id, wavelength_nm
    """), {"ids": dye_ids}).fetchall()

    from collections import defaultdict
    dye_ks = defaultdict(dict)
    for r in rows:
        dye_ks[r.dye_id][r.wavelength_nm] = r.ks

    WAVELENGTHS = list(range(400, 710, 10))
    # order by dye_ids order, not DB order
    KSU = np.array([
        [dye_ks[did][wl] for wl in WAVELENGTHS]
        for did in dye_ids
    ])
    return KSU

def load_dye_names_by_db_ids(db: Session, dye_ids: list[int]):
    rows = db.execute(text("""
        SELECT id, trade_name, ci_number
        FROM dye
        WHERE id = ANY(:ids)
        ORDER BY id
    """), {"ids": dye_ids}).fetchall()
    return {r.id: {"name": r.trade_name, "ci": r.ci_number} for r in rows}


@router.post("/allen")
def match_allen(body: AllenInput, db: Session = Depends(get_db)):
    # 1. get all dyes ordered by id
    all_dyes = db.execute(text("""
        SELECT id, trade_name, ci_number
        FROM dye ORDER BY id
    """)).fetchall()

    if any(i < 1 or i > len(all_dyes) for i in body.dye_indices):
        raise HTTPException(400,
            f"dye_indices must be between 1 and {len(all_dyes)}")

    # map 1-based position → actual DB id
    selected_dye_ids = [all_dyes[i - 1].id for i in body.dye_indices]
    print(f"Selected dyes: {[(i, all_dyes[i-1].trade_name) for i in body.dye_indices]}")

    # 2. load illuminant
    D65, OBS = load_illuminant(db)

    # 3. PCA reflectance estimation from XYZ
    munsell_rows = db.execute(text("""
        SELECT sample_index, wavelength_nm, reflectance
        FROM munsell_reflectance
        ORDER BY sample_index, wavelength_nm
    """)).fetchall()

    from collections import defaultdict
    munsell_dict = defaultdict(dict)
    for r in munsell_rows:
        munsell_dict[r.sample_index][r.wavelength_nm] = r.reflectance

    WAVELENGTHS = list(range(400, 710, 10))
    n_samples = len(munsell_dict)
    MM = np.array([
        [munsell_dict[i][wl] for wl in WAVELENGTHS]
        for i in range(1, n_samples + 1)
    ])

    mean_R = MM.mean(axis=0)
    MM_centered = MM - mean_R
    cov = np.cov(MM_centered.T)
    eigenvalues, eigenvectors = np.linalg.eigh(cov)
    V = eigenvectors[:, -3:]  # top 3 eigenvectors (31, 3)

    K = 100.0 / np.sum(D65 * OBS[:, 1])
    XYZ_PCA = K * OBS.T @ np.diag(D65) @ V  # (3, 3)

    XYZ_query = np.array([body.X, body.Y, body.Z])
    compressed = np.linalg.inv(XYZ_PCA) @ XYZ_query
    R_std = V @ compressed + mean_R
    R_std = np.clip(R_std, 0.001, 0.999)

    # 4. load substrate and k/s
    R_sub, _ = load_substrate(db)
    KSU = load_ksu(db, selected_dye_ids)

    # 5. run Allen
    from ..core.algorithms import allen_match
    result = allen_match(R_std, R_sub, D65, OBS, KSU)

    # 6. build response
    dye_info = load_dye_names_by_db_ids(db, selected_dye_ids)

    return {
        "input": {"X": body.X, "Y": body.Y, "Z": body.Z},
        "dye_indices": body.dye_indices,
        "method_used": "allen",
        "dyes": [
            {
                "name": dye_info[did]["name"],
                "ci_number": dye_info[did]["ci"],
                "concentration": float(result["concentrations"][i])
            }
            for i, did in enumerate(selected_dye_ids)
        ],
        "delta_e": result["delta_e"],
        "XYZ_matched": result["XYZ"],
        "Lab_matched": result["Lab"]
    }


@router.get("/dyes")
def list_dyes(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, trade_name, ci_number, manufacturer
        FROM dye ORDER BY id
    """)).fetchall()
    return [
        {
            "index": r.id,
            "name": r.trade_name,
            "ci_number": r.ci_number,
            "manufacturer": r.manufacturer
        }
        for r in rows
    ]



@router.post("/xyz-to-rgb")
def xyz_to_rgb(body: XYZInput, db: Session = Depends(get_db)):
    XYZ = np.array([body.X, body.Y, body.Z])
    
    # XYZ → linear RGB using sRGB matrix
    # divide by 100 first (our XYZ is 0-100 scale)
    xyz = XYZ / 100.0
    
    # sRGB matrix (inverse of the one in colormath.py)
    M = np.array([
        [ 3.2404542, -1.5371385, -0.4985314],
        [-0.9692660,  1.8760108,  0.0415560],
        [ 0.0556434, -0.2040259,  1.0572252]
    ])
    
    rgb_linear = M @ xyz
    rgb_linear = np.clip(rgb_linear, 0, 1)
    
    # gamma correction (linearize → sRGB)
    def gamma(c):
        if c <= 0.0031308:
            return 12.92 * c
        return 1.055 * (c ** (1/2.4)) - 0.055
    
    r, g, b = [gamma(c) for c in rgb_linear]
    
    # scale to 0-255
    R = int(round(r * 255))
    G = int(round(g * 255))
    B = int(round(b * 255))
    
    return {
        "input": {"X": body.X, "Y": body.Y, "Z": body.Z},
        "rgb": {"R": R, "G": G, "B": B},
        "hex": f"#{R:02X}{G:02X}{B:02X}"
    }


def find_best_combination(
    Lab_query: np.ndarray,
    combo_type: int,
    db: Session,
    method: str,
    D65: np.ndarray,
    OBS: np.ndarray
) -> dict:
    """Try all combinations of given type, return the one with lowest delta_e_real"""
    
    # get all combinations of this type
    combos = db.execute(text("""
        SELECT id, name FROM dye_combination
        WHERE combo_type = :ct
        ORDER BY id
    """), {"ct": combo_type}).fetchall()

    from ..core.colormath import compute_lab_from_concentrations

    best = None
    best_delta_e = float("inf")

    for combo in combos:
        # load LUT for this specific combination
        lut_rows = load_lut(db, combo_type, combo.id)
        if not lut_rows:
            continue

        Lab_points = np.array([[r.l_star, r.a_star, r.b_star]
                                for r in lut_rows])
        concentrations = np.array([
            [r.conc_1, r.conc_2] if combo_type == 2
            else [r.conc_1, r.conc_2, r.conc_3 or 0.0]
            for r in lut_rows
        ])

        # run matching
        if method == "delaunay":
            result = delaunay_interpolation(Lab_query, Lab_points, concentrations)
        else:
            result = nearest_neighbor(Lab_query, Lab_points, concentrations)

        # get dye ids for this combo
        dye_rows = db.execute(text("""
            SELECT cm.dye_id, cm.slot_index, d.trade_name, d.ci_number
            FROM combination_member cm
            JOIN dye d ON d.id = cm.dye_id
            WHERE cm.combination_id = :cid
            ORDER BY cm.slot_index
        """), {"cid": combo.id}).fetchall()

        winning_dye_ids = [d.dye_id for d in dye_rows]
        KSU = load_ksu(db, winning_dye_ids)
        _, KS_sub = load_substrate(db)

        # compute real delta_e
        try:
            Lab_produced = compute_lab_from_concentrations(
                result["concentrations"],
                KSU,
                KS_sub,
                D65,
                OBS
            )
            real_delta_e = float(np.sqrt(
                np.sum((Lab_query - Lab_produced) ** 2)
            ))
        except Exception:
            continue

        if real_delta_e < best_delta_e:
            best_delta_e = real_delta_e
            best = {
                "combination_id":   combo.id,
                "combination_name": combo.name,
                "method_used":      result["method"],
                "inside_gamut":     result["method"] == "delaunay",
                "produced_Lab":     Lab_produced.tolist(),
                "delta_e_real":     real_delta_e,
                "delta_e_lut":      result.get("distance", 0.0),
                "concentrations":   result["concentrations"],
                "dyes": [
                    {
                        "name":          d.trade_name,
                        "ci_number":     d.ci_number,
                        "concentration": result["concentrations"][d.slot_index]
                    }
                    for d in dye_rows
                ]
            }

    return best



from fastapi import File, UploadFile
import base64
from PIL import Image
import io

@router.post("/extract-rgb")
async def extract_rgb(file: UploadFile = File(...)):
    """Extract average RGB from center 200x200 pixels of uploaded image"""
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    
    # crop center 200x200
    w, h = img.size
    crop_size = 200
    left   = (w - crop_size) // 2
    top    = (h - crop_size) // 2
    right  = left + crop_size
    bottom = top  + crop_size
    
    cropped = img.crop((left, top, right, bottom))
    
    # get average RGB
    pixels = list(cropped.getdata())
    n = len(pixels)
    R = int(sum(p[0] for p in pixels) / n)
    G = int(sum(p[1] for p in pixels) / n)
    B = int(sum(p[2] for p in pixels) / n)
    
    return {"R": R, "G": G, "B": B, "hex": f"#{R:02X}{G:02X}{B:02X}"}


@router.get("/history")
def get_history(limit: int = 20, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            ms.id,
            ms.created_at,
            ms.method_used,
            ms.combo_type,
            dc.name as combination_name,
            ms.input_R, ms.input_G, ms.input_B,
            ms.query_L, ms.query_a, ms.query_b,
            ms.delta_e_real,
            ms.inside_gamut,
            ms.result_json
        FROM matching_session ms
        LEFT JOIN dye_combination dc ON dc.id = ms.combination_id
        ORDER BY ms.created_at DESC
        LIMIT :limit
    """), {"limit": limit}).fetchall()

    return [
        {
            "id":               r.id,
            "created_at":       r.created_at.isoformat(),
            "method":           r.method_used,
            "combination":      r.combination_name,
            "rgb":              {"R": r.input_r, "G": r.input_g, "B": r.input_b},
            "Lab":              [r.query_l, r.query_a, r.query_b],
            "delta_e":          r.delta_e_real,
            "inside_gamut":     r.inside_gamut,
            "result":           r.result_json,
        }
        for r in rows
    ]


@router.get("/gamut/{combination_id}")
def get_gamut(combination_id: int, space: str = "xy", db: Session = Depends(get_db)):
    """
    Returns gamut boundary points for a dye combination.
    space: 'xy' for CIE 1931 chromaticity, 'ab' for L*a*b* a*b* plane
    """
    rows = db.execute(text("""
        SELECT x, y, z, l_star, a_star, b_star
        FROM lut_entry
        WHERE combination_id = :cid
    """), {"cid": combination_id}).fetchall()

    if not rows:
        raise HTTPException(404, "No LUT entries for this combination")

    if space == "xy":
        points = []
        for r in rows:
            total = r.x + r.y + r.z
            if total > 0:
                points.append({
                    "x": r.x / total,
                    "y": r.y / total
                })
    elif space == "ab":
        points = [{"a": r.a_star, "b": r.b_star} for r in rows]
    else:
        raise HTTPException(400, "space must be 'xy' or 'ab'")

    # get combination name
    combo = db.execute(text("""
        SELECT name FROM dye_combination WHERE id = :cid
    """), {"cid": combination_id}).fetchone()

    return {
        "combination_id": combination_id,
        "combination_name": combo.name if combo else None,
        "space": space,
        "points": points
    }


class SpectralInput(BaseModel):
    reflectance: list[float]  # 31 values, 400-700nm in 10nm steps
    method: str = "delaunay"
    combo_type: int = 3


@router.post("/spectral")
def match_from_spectral(body: SpectralInput, db: Session = Depends(get_db)):
    if len(body.reflectance) != 31:
        raise HTTPException(400, "reflectance must contain exactly 31 values (400-700nm, 10nm steps)")

    R_std = np.clip(np.array(body.reflectance), 0.001, 0.999)
    D65, OBS = load_illuminant(db)

    # reflectance → XYZ
    from ..core.colormath import reflectance_to_xyz, xyz_to_lab
    XYZ_query = reflectance_to_xyz(R_std, D65, OBS)
    XYZ_n = np.array([
        100 * np.sum(D65 * OBS[:, 0]) / np.sum(D65 * OBS[:, 1]),
        100.0,
        100 * np.sum(D65 * OBS[:, 2]) / np.sum(D65 * OBS[:, 1])
    ])
    Lab_query = xyz_to_lab(XYZ_query, XYZ_n)

    XYZ_total = XYZ_query[0] + XYZ_query[1] + XYZ_query[2]
    query_xy = {
        "x": XYZ_query[0] / XYZ_total if XYZ_total > 0 else 0,
        "y": XYZ_query[1] / XYZ_total if XYZ_total > 0 else 0
    }
    query_ab = {"a": float(Lab_query[1]), "b": float(Lab_query[2])}

    best = find_best_combination(
        Lab_query, body.combo_type, db, body.method, D65, OBS
    )
    if not best:
        raise HTTPException(404, "No matching combination found")

    return {
        "input":     {"reflectance": body.reflectance},
        "query_Lab": Lab_query.tolist(),
        "query_xy":  query_xy,
        "query_ab":  query_ab,
        "XYZ":       XYZ_query.tolist(),
        **best
    }