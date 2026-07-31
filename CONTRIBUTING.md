# Contributing

Thank you for helping improve `threejs-sculpt-dna`.

## Ways to contribute

- report reproducible bugs
- improve skill instructions and references
- add validation and deterministic-generation tests
- propose procedural geometry or material strategies
- improve browser review and visual evidence workflows
- contribute a reference reconstruction when you have permission to share the source image

## Development setup

Requirements:

- Python 3.10 or newer
- Node.js 22 or newer for browser examples
- GitHub Copilot with plugin support for end-to-end skill testing

Clone and verify:

```bash
git clone https://github.com/hyeonsangjeon/threejs-sculpt-dna.git
cd threejs-sculpt-dna

python3 scripts/prove.py --output proof-run.json
```

Install example dependencies:

```bash
npm ci --prefix examples/showcase
npm ci --prefix examples/repolis-hero
npm ci --prefix examples/brick-offroad-hero
npm ci --prefix examples/seoul-palace-hero
npm ci --prefix examples/proof-lab
npm ci --prefix adapters/react-three-fiber
npm ci --prefix examples/react-three-fiber
```

Build the flagship:

```bash
npm --prefix examples/repolis-hero run build
npm --prefix adapters/react-three-fiber run check
npm --prefix examples/react-three-fiber test
npm --prefix examples/react-three-fiber run build
```

Install the working plugin locally only after removing any marketplace copy;
keep one active installation to avoid cached skill shadowing:

```bash
copilot plugin install "$(pwd)"
```

## Before changing code

1. Read the relevant `SKILL.md`.
2. Follow linked references instead of duplicating instructions.
3. Search existing scripts and schemas before adding new helpers.
4. Preserve compatibility unless the change includes a migration plan.
5. Never weaken visual, constraint, invariant, or evidence gates to make a test pass.

## Quality requirements

### Python and data changes

- use Python standard-library solutions unless a dependency is justified
- keep JSON output deterministic
- reject invalid input explicitly
- add focused `unittest` coverage
- run strict ObjectSculptSpec validation when examples change

### Skill documentation

- keep frontmatter name and description accurate
- make every bundled reference reachable through a Markdown link
- use concrete Three.js and technical-art terminology
- distinguish production variants from preview exploration

### React Three Fiber adapter

- keep React, Three.js, and React Three Fiber as peer dependencies
- create procedural resources after commit, never as a render-phase side effect
- keep high-frequency updates in `useFrame` or the factory, not React state
- render factory roots through `primitive` with R3F disposal disabled
- delegate cleanup to the plain factory exactly once, or use the adapter's
  owned-root fallback when a plain `Object3D` exposes no disposer
- test mount, semantic prop rebuild, StrictMode, frame update, and unmount

### Visual changes

Include:

- the reference or an authorized derivative
- a browser render from a named camera
- a reference/render comparison
- global and semantic feature review notes
- performance or generation statistics when relevant

Do not mark a visual pass complete from source inspection alone.

### Reference image policy

- only contribute images you created or have permission to redistribute
- remove GPS, device, and sensitive EXIF metadata
- crop irrelevant private content
- optimize repository assets
- document when a reference is generated, photographed, or otherwise derived

## Pull requests

Keep each pull request focused.

The description should include:

- problem and user impact
- implementation summary
- compatibility considerations
- verification performed
- screenshots or comparison evidence for visual changes

All commits should use a clear author identity and must not include secrets.

## Marketplace changes

Keep `plugin.json` and `.github/plugin/marketplace.json` versions synchronized.

Verify:

```bash
python3 -m json.tool plugin.json
python3 -m json.tool .github/plugin/marketplace.json
```

Then test marketplace installation:

```bash
copilot plugin marketplace add "$(pwd)"
copilot plugin install threejs-sculpt-dna@threejs-copilot-plugins
```

## Code of conduct

Be respectful, specific, and constructive. Harassment, personal attacks, and unauthorized redistribution of other people's assets are not accepted. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
