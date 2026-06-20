/*
 * Card engine — public surface.
 *
 * The new card-generation architecture: a fixed catalog of typed, library-backed
 * components (Recharts + app-themed primitives) rendered from a small declarative
 * spec. No in-browser code transpilation, no eval. The LLM only routes a prompt
 * to a type + props (or a named adapter over a live provider binding); 100
 * predefined templates cover the most common requests with zero LLM calls.
 */
export { SpecCard } from './SpecCard.jsx';
export { CARD_TYPES, CARD_CATALOG, CARD_TYPE_IDS, validateProps } from './registry.js';
export { ADAPTERS, applyAdapter } from './adapters.js';
export { TEMPLATES, TEMPLATE_CATEGORIES, instantiateTemplate } from './templates.js';
export { SPEC_SYSTEM_PROMPT, DASHBOARD_SYSTEM_PROMPT, parseDashboardResponse, buildSpecUserMessage, normalizeSpec, matchTemplate } from './router.js';
export { getCachedSpec, setCachedSpec, clearSpecCache } from './cache.js';
