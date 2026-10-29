"""Hyperbolic PolyStep reference: polystep's gradient-free step on the hyperboloid, run as three channels on the
zero-point clock. See ../README.md and ../../explainers/reference-guide.html."""
from .prng import Rng
from .step import PolyStepH, StepConfig, StepState
from .channels import TriChannel, ON, OFF

__all__ = ['Rng', 'PolyStepH', 'StepConfig', 'StepState', 'TriChannel', 'ON', 'OFF']
