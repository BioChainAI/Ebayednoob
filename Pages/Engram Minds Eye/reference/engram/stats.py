"""The statistics of the preregistration: a 95% percentile bootstrap interval over instances (10,000 resamples,
seed 7), exactly as Hyperbolic PolyStep's run_bench.py computes it (numpy's default_rng)."""
import numpy as np


def ci_mean(values, resamples=10_000, seed=7):
    v = np.asarray(values, dtype=float)
    rng = np.random.default_rng(seed)
    means = np.array([v[rng.integers(0, len(v), len(v))].mean() for _ in range(resamples)])
    lo, hi = np.percentile(means, [2.5, 97.5])
    return float(v.mean()), [float(lo), float(hi)]
