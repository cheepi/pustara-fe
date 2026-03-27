declare global {
  interface PustaraTools {
    checkCacheStats: () => void;
    monitorOpenLibraryRequests: () => PerformanceObserver;
    testCacheHitRate: () => Promise<void>;
    testBatchCoverFetching: () => Promise<void>;
    testSanitization: () => Promise<void>;
    runAllTests: () => Promise<void>;
  }

  interface Window {
    pustara: PustaraTools;
  }
}

export {};
