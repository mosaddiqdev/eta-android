import { configDefaults, defineConfig } from "vitest/config";

// android/ is generated and holds a copy of the built site, which must not be picked up as tests.
export default defineConfig({ test: { exclude: [...configDefaults.exclude, "android/**"] } });
