import numpy as np
from scipy.spatial import Delaunay
from .colormath import (
    reflectance_to_ks, ks_to_reflectance,
    reflectance_to_xyz, xyz_to_lab, delta_e
)


# ── Nearest Neighbor ─────────────────────────────────────────
def nearest_neighbor(query: np.ndarray,
                     points: np.ndarray,
                     concentrations: np.ndarray) -> dict:
    """
    Find closest point in color space to query.
    points: (N, 3) array of Lab or XYZ or sRGB values
    concentrations: (N, 2or3) array of dye concentrations
    Returns best concentration and delta-E
    """
    dists = np.sqrt(np.sum((points - query) ** 2, axis=1))
    idx = int(np.argmin(dists))
    return {
        "concentrations": concentrations[idx].tolist(),
        "distance": float(dists[idx]),
        "method": "nearest_neighbor"
    }


# ── Delaunay Interpolation ────────────────────────────────────
def delaunay_interpolation(query: np.ndarray,
                            points: np.ndarray,
                            concentrations: np.ndarray) -> dict:
    """
    Delaunay triangulation + barycentric interpolation.
    query: (3,) point in color space
    points: (N, 3) LUT color coordinates
    concentrations: (N, K) dye concentrations
    """
    tri = Delaunay(points)
    simplex = tri.find_simplex(query)

    if simplex == -1:
        # outside convex hull — fall back to nearest neighbor
        result = nearest_neighbor(query, points, concentrations)
        result["method"] = "nearest_neighbor_fallback"
        return result

    # barycentric coordinates
    transform = tri.transform[simplex]
    b = transform[:3, :3] @ (query - transform[3])
    bary = np.append(b, 1 - b.sum())

    # interpolate concentrations
    vertices = tri.simplices[simplex]
    interp_conc = np.sum(
        bary[:, None] * concentrations[vertices], axis=0
    )
    # clip negatives
    interp_conc = np.clip(interp_conc, 0, None)

    return {
        "concentrations": interp_conc.tolist(),
        "distance": 0.0,
        "method": "delaunay"
    }


# ── Allen Color Matching ──────────────────────────────────────
def allen_match(R_std: np.ndarray,
                R_sub: np.ndarray,
                D65: np.ndarray,
                OBS: np.ndarray,
                KSU: np.ndarray,
                max_iter: int = 500,
                tol: float = 0.001) -> dict:
    """
    Allen colorimetric matching algorithm.
    R_std: (31,) target reflectance
    R_sub: (31,) substrate reflectance
    D65:   (31,) illuminant
    OBS:   (31,3) observer
    KSU:   (n_dyes, 31) unit k/s for selected dyes
    """
    KS_sub = reflectance_to_ks(R_sub)
    E = np.diag(D65)
    D = np.diag(2 * R_std**2 / (R_std**2 - 1))
    Fi = KSU  # (n_dyes, 31)
    F_t = reflectance_to_ks(R_std)

    # initial estimate
    A = OBS.T @ E @ D @ Fi.T   # (3, n_dyes)
    b = OBS.T @ E @ D @ (F_t - KS_sub)  # (3,)
    C = np.linalg.lstsq(A, b, rcond=None)[0]

    def compute_R(C):
        KS = KS_sub + Fi.T @ C
        return ks_to_reflectance(KS)

    def compute_lab(R):
        XYZ_n = reflectance_to_xyz(np.ones(31), D65, OBS)
        XYZ = reflectance_to_xyz(R, D65, OBS)
        return xyz_to_lab(XYZ, XYZ_n)

    R_a = compute_R(C)
    Lab_std = compute_lab(R_std)
    Lab_a = compute_lab(R_a)
    dE = delta_e(Lab_std, Lab_a)

    for _ in range(max_iter):
        if dE < tol:
            break
        XYZ_std = reflectance_to_xyz(R_std, D65, OBS)
        XYZ_a = reflectance_to_xyz(R_a, D65, OBS)
        dt = XYZ_std - XYZ_a
        dC = np.linalg.lstsq(A, dt, rcond=None)[0]
        C = C + dC
        R_a = compute_R(C)
        Lab_a = compute_lab(R_a)
        dE = delta_e(Lab_std, Lab_a)

    XYZ_n = reflectance_to_xyz(np.ones(31), D65, OBS)
    XYZ_result = reflectance_to_xyz(R_a, D65, OBS)

    return {
        "concentrations": C.tolist(),
        "delta_e": dE,
        "method": "allen",
        "XYZ": XYZ_result.tolist(),
        "Lab": compute_lab(R_a).tolist()
    }