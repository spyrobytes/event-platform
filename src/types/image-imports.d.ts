/*
 * Static image imports (e.g. the landing hero montage) rely on Next's
 * `*.jpg` module declarations. Those normally come in via next-env.d.ts,
 * but that file is generated and gitignored here, so CI's standalone
 * `tsc --noEmit` never sees it. This committed reference keeps image
 * imports typed everywhere. Safe alongside next-env.d.ts locally —
 * duplicate type references are idempotent.
 */
/// <reference types="next/image-types/global" />
