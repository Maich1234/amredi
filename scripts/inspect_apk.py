"""Inspect a finished APK without executing it. Usage: python scripts/inspect_apk.py FILE.apk."""
import json
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

path = Path(sys.argv[1]).resolve()
with zipfile.ZipFile(path) as apk:
    corrupt = apk.testzip()
    if corrupt:
        raise SystemExit(f'Corrupt ZIP member: {corrupt}')
    entries = apk.infolist()
    bundles = [i for i in entries if i.filename.startswith('assets/') and
               (i.filename.endswith(('.bundle', '.hbc')) or 'index.android.bundle' in i.filename)]
    if not bundles:
        raise SystemExit('No embedded JavaScript/Hermes bundle found; do not distribute this APK.')
    libraries = defaultdict(lambda: {'compressed_bytes': 0, 'uncompressed_bytes': 0})
    for item in entries:
        if item.filename.startswith('lib/') and item.filename.endswith('.so'):
            abi = item.filename.split('/')[1]
            libraries[abi]['compressed_bytes'] += item.compress_size
            libraries[abi]['uncompressed_bytes'] += item.file_size
    print(json.dumps({
        'file': path.name,
        'apk_bytes': path.stat().st_size,
        'apk_mib': round(path.stat().st_size / 1024**2, 2),
        'zip_entry_bytes': sum(i.file_size for i in entries),
        'embedded_bundles': [{'name': i.filename, 'bytes': i.file_size,
                              'compressed_bytes': i.compress_size} for i in bundles],
        'native_libraries_by_abi': dict(libraries),
        'note': 'ZIP entry bytes are not a measurement of Android installed storage.',
    }, indent=2))
