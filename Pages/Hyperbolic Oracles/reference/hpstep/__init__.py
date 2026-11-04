"""Hyperbolic PolyStep reference: polystep's gradient-free step on the hyperboloid, run as three channels on the
zero-point clock. See ../README.md and ../../explainers/reference-guide.html.

Only the step (step.py) needs torch and polystep, so it is loaded the first time one of its names is used
(PEP 562). Everything else, the exact modules prng, exact, hyperbolic, problems, channels, decode3d, frames3d,
twin3d and fence, imports without torch: `from hpstep import fence` works on a machine with numpy alone. Other
systems import them that way, in place (Pages/Engram Minds Eye, decision D7)."""
from importlib import import_module

from .prng import Rng
from .channels import TriChannel, ON, OFF

_FROM_STEP = ('PolyStepH', 'StepConfig', 'StepState')


def __getattr__(name):
    """Load step.py, and with it torch and polystep, the first time the step or one of its names is asked for."""
    if name in _FROM_STEP or name == 'step':
        step = import_module('.step', __name__)
        for n in _FROM_STEP:
            globals()[n] = getattr(step, n)
        return step if name == 'step' else globals()[name]
    raise AttributeError(f'module {__name__!r} has no attribute {name!r}')


def __dir__():
    return sorted(set(globals()) | set(_FROM_STEP) | {'step'})


__all__ = ['Rng', 'PolyStepH', 'StepConfig', 'StepState', 'TriChannel', 'ON', 'OFF']
