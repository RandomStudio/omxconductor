# OMX Conductor

Docs coming soon.

A successor to https://github.com/anselanza/omx-layers

This library was built using the very thorough [Typescript Library Starter](https://github.com/Hotell/typescript-lib-starter) to achieve:

- TypeScript compilation
- A proper test framework
- Linting
- Very nit-picking checks on `git commit`, `git push`, etc.
- And [more cool stuff](https://github.com/Hotell/typescript-lib-starter/blob/master/.github/CONTRIBUTING.md#technical-overview)

## Testing clients against local (linked) version

You need to run `yarn link` in the `dist` folder (after building).

## Quick build

If you are testing on a Raspberry Pi and need a quick(er) build (no linting, no tests, etc.), run:

```
yarn quickbuild
```
