# Changelog

## [0.9.5](https://github.com/Replikanti/flowlint-core/compare/v0.9.4...v0.9.5) (2025-12-25)


### Bug Fixes

* **ci:** strictly use pull_request event for security (SQ fix) ([a327840](https://github.com/Replikanti/flowlint-core/commit/a3278401e8194d18ba7a9287cefcfbf12bd646b6))

## [0.9.4](https://github.com/Replikanti/flowlint-core/compare/v0.9.3...v0.9.4) (2025-12-25)


### Bug Fixes

* **core:** refactor tests/utils.spec.ts to reduce code duplication (FLT-62) ([30ff9f7](https://github.com/Replikanti/flowlint-core/commit/30ff9f78258119680580d581d0c32fc8394d97bb))
* **core:** use node: prefix for built-in modules ([ede04ae](https://github.com/Replikanti/flowlint-core/commit/ede04ae0d24bcec0458897cb1c15ad9bd8263d1a))

## [0.9.3](https://github.com/Replikanti/flowlint-core/compare/v0.9.2...v0.9.3) (2025-12-22)


### Bug Fixes

* **ci:** move permissions to job level in release workflow ([9d08eec](https://github.com/Replikanti/flowlint-core/commit/9d08eec02e8a430f3bb795d0d8c11cdaea68bc30))
* **ci:** split approve and merge steps to fix token permissions ([34f8b8e](https://github.com/Replikanti/flowlint-core/commit/34f8b8e35991911aa141575e87c97f6cb4e29dd8))
* **core:** comprehensive cleanup and security fixes ([fa2edc5](https://github.com/Replikanti/flowlint-core/commit/fa2edc574ad7f11d4c2bfa5ff3a67ce2f3c44886))

## [0.9.2](https://github.com/Replikanti/flowlint-core/compare/v0.9.1...v0.9.2) (2025-12-22)


### Bug Fixes

* **ci:** split approve and merge steps to fix token permissions ([34f8b8e](https://github.com/Replikanti/flowlint-core/commit/34f8b8e35991911aa141575e87c97f6cb4e29dd8))

## [0.9.1](https://github.com/Replikanti/flowlint-core/compare/v0.9.0...v0.9.1) (2025-12-19)


### Bug Fixes

* enable manual CI trigger and fix release PR execution ([0606cea](https://github.com/Replikanti/flowlint-core/commit/0606cea436fc164d200b39a4f81a2973d7054f0e))
* enable manual CI trigger and fix release-please token to trigger CI ([5ffb6de](https://github.com/Replikanti/flowlint-core/commit/5ffb6de9964eca7bad1371ef923fb83de11f9cb5))
* further reduce duplication risk by breaking strings and improving sonar exclusions ([8add516](https://github.com/Replikanti/flowlint-core/commit/8add5164579e1b832410c03db57daebba81eccdf))
* move rule metadata to JSON to eliminate code duplication ([3804171](https://github.com/Replikanti/flowlint-core/commit/380417155db2b4d83461273d33f32640dcbdab04))
* reduce code duplication in metadata and tests to satisfy SonarQube ([ff7bb11](https://github.com/Replikanti/flowlint-core/commit/ff7bb114ae5b40bfd59781e8b83bf83bab0737ae))
* reduce code duplication in metadata and tests to satisfy SonarQube ([39e04fc](https://github.com/Replikanti/flowlint-core/commit/39e04fcacbb18502acbe6f35a039f17491620284))
* rename CI job to 'CI' and revert metadata to TS to fix build ([413d16c](https://github.com/Replikanti/flowlint-core/commit/413d16cae60af0e3027681a24cf22174468687da))
* rename CI job to 'CI' and revert metadata to TS to fix build ([9141a0f](https://github.com/Replikanti/flowlint-core/commit/9141a0f5b711dff12a0526ceab0d4c326c4f6155))

## [0.9.0](https://github.com/Replikanti/flowlint-core/compare/v0.8.0...v0.9.0) (2025-12-15)


### Features

* export rules metadata for automated documentation ([bcda723](https://github.com/Replikanti/flowlint-core/commit/bcda72320eea6c4087e4b5c67855f751baa25d80))


### Bug Fixes

* **ci:** add automerge workflow and trigger to core release process ([380bf28](https://github.com/Replikanti/flowlint-core/commit/380bf282f1a4b989f885a634e5e456ad6bfd8664))
* **ci:** enable automatic release on push to main ([bee220f](https://github.com/Replikanti/flowlint-core/commit/bee220f82027ed4b9162e75876f9fb2a55fe1cdd))

## [0.8.0](https://github.com/Replikanti/flowlint-core/compare/v0.7.1...v0.8.0) (2025-12-13)


### Features

* **ci:** trigger docs sync in flowlint-examples after release ([170e345](https://github.com/Replikanti/flowlint-core/commit/170e34539986796587e6a8d94def47e37ab2ac2e))
* **ci:** use github app token for dispatch ([fdd0afe](https://github.com/Replikanti/flowlint-core/commit/fdd0afeac015a367df3042f4de40b12681148ff5))


### Bug Fixes

* **ci:** normalize github actions SHAs to v4.1.7/v4.0.3 ([c458c15](https://github.com/Replikanti/flowlint-core/commit/c458c155906e6a3d7f4d2425ab0b924455a23385))
* **ci:** revert to action tags to fix download errors ([547dc87](https://github.com/Replikanti/flowlint-core/commit/547dc878e153ff6cc36d9438d40c6666ed307659))
* **ci:** use github app token for auto-approve ([739574c](https://github.com/Replikanti/flowlint-core/commit/739574c05b0669869d0ca10c4a009088f56d6675))
* **ci:** use PAT for auto-approve to satisfy code owners ([e81cc8e](https://github.com/Replikanti/flowlint-core/commit/e81cc8ef2deeaf622b8505077b1c3bf33354d87d))
* **ci:** use tag v4 for auto-approve-action to fix download error ([5e3f1de](https://github.com/Replikanti/flowlint-core/commit/5e3f1dedd915687da3429fc14a99d60b2adb3abf))
* **ci:** use valid SHA for create-github-app-token ([2732de2](https://github.com/Replikanti/flowlint-core/commit/2732de288ddb1f0625013e7ea23a93856c106ea5))
* force release trigger ([c12c360](https://github.com/Replikanti/flowlint-core/commit/c12c360662ae356cd254dbf4897ca4f55602c3f7))
* force release trigger ([b654b00](https://github.com/Replikanti/flowlint-core/commit/b654b0043bae15f861d0876bb7f93774e591db66))
