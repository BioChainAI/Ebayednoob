"""Lint the proposed 0xA kernel with SHD-CCP's own Kernel Ontology tooling, read-only.

    python3 -B -I "Pages/Hyperbolic Lexicon/proposals/check_kernel.py" [path to an SHD-CCP checkout]

The SHD-CCP checkout defaults to the one beside this repository (../SHD-CCP). Nothing is written into it: run with
python3 -B -I so no __pycache__ appears, and the kernel is copied into a temporary mirror of the registry's
01_Incubator_Experimental/proposed_codex/ folder, because the linter reads a kernel's stage from its path.

Runs lint_kernel (keys, Form/Domain agreement, status allowed in the incubator, dependencies, allocation) and the
two implemented validation suites, layout_integrity and glass_box_round_trip. Exits 0 when all pass, 1 on any
problem, and 2 (skipped) when no SHD-CCP checkout is found.
"""
import json
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
KERNEL = HERE / "kernel_0xA_hyperbolic_address.json"
default = HERE.parents[3] / "SHD-CCP"
shd = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else default
tooling = shd / "SHD-CCP_Kernel_Ontology" / "Agent_Tooling"
if not (tooling / "ontology.py").exists():
    print(f"skipped: no SHD-CCP checkout at {shd}")
    sys.exit(2)
sys.dont_write_bytecode = True
sys.path.insert(0, str(tooling))

import ontology as ont  # noqa: E402  (SHD-CCP's module, read-only)
import suites  # noqa: E402

base, tags = ont.load_base(), ont.load_tags()
kernel = json.loads(KERNEL.read_text())
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    stage = root / "01_Incubator_Experimental" / "proposed_codex"
    stage.mkdir(parents=True)
    path = stage / KERNEL.name
    shutil.copyfile(KERNEL, path)
    problems = ont.lint_kernel(path, base, tags, root=root)

checks = {"layout_integrity": suites.layout_integrity(kernel, base), "glass_box_round_trip": suites.glass_box_round_trip(kernel, base)}
taken = sorted({ont.form_id(ont.read_kernel(p)) for p in ont.kernel_files()})
print(f"kernel {kernel['Kernel_Name']} · Form {kernel['Form_ID']} · Domain {kernel['Domain']} · Status {kernel['Status']}")
print(f"lint_kernel: {'pass' if not problems else 'FAIL: ' + '; '.join(problems)}")
for name, r in checks.items():
    print(f"{name}: {r['result']} ({r['details']})")
print(f"pending suites (block [PROVEN]): {', '.join(sorted(suites.PENDING_SUITES))}")
print(f"Form IDs already used in the registry: {', '.join(hex(f) for f in taken)}; 0xA {'is FREE' if 0xA not in taken else 'is TAKEN'}")
print(f"allocation hash: {ont.allocation_hash(kernel)}")
ok = not problems and all(r["result"] == "pass" for r in checks.values()) and 0xA not in taken
print("kernel check: " + ("pass" if ok else "FAIL"))
sys.exit(0 if ok else 1)
