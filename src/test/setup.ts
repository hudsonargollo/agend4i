// Test setup file for vitest
import { beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Global test setup
beforeAll(() => {
  // Setup code that runs before all tests
})

afterEach(() => {
  // Cleanup after each test
  cleanup()
})

afterAll(() => {
  // Cleanup code that runs after all tests
})