import numpy as np

WAVELENGTHS = list(range(400, 710, 10))  # 31 points


def reflectance_to_ks(R: np.ndarray) -> np.ndarray:
    """Kubelka-Munk: R → K/S"""
    return ((1 - R) ** 2) / (2 * R)


def ks_to_reflectance(KS: np.ndarray) -> np.ndarray:
    """Kubelka-Munk inverse: K/S → R"""
    return 1 + KS - np.sqrt(KS**2 + 2 * KS)


def reflectance_to_xyz(R: np.ndarray, D65: np.ndarray,
                        OBS: np.ndarray) -> np.ndarray:
    """R (31,) → XYZ under D65/10°"""
    K = 100.0 / np.sum(D65 * OBS[:, 1])
    X = K * np.sum(D65 * OBS[:, 0] * R)
    Y = K * np.sum(D65 * OBS[:, 1] * R)
    Z = K * np.sum(D65 * OBS[:, 2] * R)
    return np.array([X, Y, Z])


def xyz_to_lab(XYZ: np.ndarray, XYZ_n: np.ndarray) -> np.ndarray:
    """XYZ → CIE L*a*b*"""
    def f(t):
        return np.cbrt(t) if t > (6/29)**3 else t / (3 * (6/29)**2) + 4/29
    fx = f(XYZ[0] / XYZ_n[0])
    fy = f(XYZ[1] / XYZ_n[1])
    fz = f(XYZ[2] / XYZ_n[2])
    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b = 200 * (fy - fz)
    return np.array([L, a, b])


def srgb_to_xyz(sRGB: np.ndarray) -> np.ndarray:
    """sRGB (0-255) → XYZ using standard IEC 61966-2-1 matrix"""
    # normalize to 0-1
    rgb = sRGB.astype(float) / 255.0
    # linearize
    def linearize(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = [linearize(c) for c in rgb]
    # sRGB → XYZ D65 matrix
    X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b
    Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b
    return np.array([X * 100, Y * 100, Z * 100])


def delta_e(Lab1: np.ndarray, Lab2: np.ndarray) -> float:
    """CIE76 ΔE"""
    return float(np.sqrt(np.sum((Lab1 - Lab2) ** 2)))


def compute_lab_from_concentrations(
    concentrations: list,
    dye_ksu: np.ndarray,
    ks_sub: np.ndarray,
    D65: np.ndarray,
    OBS: np.ndarray
) -> np.ndarray:
    """
    Given concentrations + unit k/s → reflectance → XYZ → Lab
    concentrations: list of floats, one per dye
    dye_ksu: (n_dyes, 31) unit k/s matrix
    ks_sub: (31,) substrate k/s
    """
    C = np.array(concentrations)
    # Kubelka-Munk mixture
    KS_mix = ks_sub + C @ dye_ksu  # (31,)
    # k/s → reflectance
    R = ks_to_reflectance(KS_mix)
    # reflectance → XYZ
    XYZ = reflectance_to_xyz(R, D65, OBS)
    # XYZ → Lab
    K = 100.0 / np.sum(D65 * OBS[:, 1])
    XYZ_n = np.array([
        K * np.sum(D65 * OBS[:, 0]),
        100.0,
        K * np.sum(D65 * OBS[:, 2])
    ])
    Lab = xyz_to_lab(XYZ, XYZ_n)
    return Lab
