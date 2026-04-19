/**
 * Vitest global test setup for the fincava frontend.
 *
 * This file runs before every test suite.
 * - Sets up @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * - Cleans up the DOM after each test automatically
 */
import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Automatically clean up after each test to avoid state leaking between tests
afterEach(() => {
    cleanup();
});
