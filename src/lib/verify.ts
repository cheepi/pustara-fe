/**
 * Performance Verification Utility
 * 
 * Use this in browser console to verify caching and batch fetching are working:
 * 
 * 1. Open DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy-paste individual functions below and run them
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Check Cache Statistics
// └─ Shows how many API requests were cached vs fresh

function checkCacheStats() {
  const { getCacheStats } = require('@/lib/cache');
  console.table(getCacheStats());
}

// Usage:
// checkCacheStats()


// ─────────────────────────────────────────────────────────────────────────────
// 2. Monitor Network Requests
// └─ Count OpenLibrary requests in one session

function monitorOpenLibraryRequests() {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const olRequests = entries.filter(e => 
      e.name && e.name.includes('openlibrary.org')
    );
    
    console.group('📊 OpenLibrary Requests');
    console.log(`Total requests: ${olRequests.length}`);
    console.table(olRequests.map(r => ({
      url: r.name.split('?')[0],
      duration: `${(r.duration).toFixed(0)}ms`
    })));
    console.groupEnd();
  });
  
  observer.observe({ entryTypes: ['resource'] });
  console.log('✅ Monitoring OpenLibrary requests. Refresh page to see results.');
  return observer;
}

// Usage:
// monitorOpenLibraryRequests()


// ─────────────────────────────────────────────────────────────────────────────
// 3. Test Cache Hit Rate
// └─ Verify cache is being used

async function testCacheHitRate() {
  const { apiCaches } = await import('@/lib/cache');
  
  console.group('🚀 Cache Hit Rate Test');
  console.log('Testing trending API cache...');
  
  // First call - should hit API
  console.time('Fresh call');
  const { fetchTrending } = await import('@/lib/api');
  const data1 = await fetchTrending(6);
  console.timeEnd('Fresh call');
  
  // Second call - should hit cache (within 60s)
  console.time('Cache hit');
  const data2 = await fetchTrending(6);
  console.timeEnd('Cache hit');
  
  console.log(`✅ Fresh request and cache hit compared above`);
  console.log(`Cache stats:`, apiCaches.trending.getStats());
  console.groupEnd();
}

// Usage:
// await testCacheHitRate()


// ─────────────────────────────────────────────────────────────────────────────
// 4. Test Batch Cover Fetching
// └─ Verify covers are batched instead of individual

async function testBatchCoverFetching() {
  const { batchFetchCovers, coverBatchCache } = await import('@/lib/coverBatch');
  
  console.group('📚 Batch Cover Fetching Test');
  
  const books = [
    { title: 'The Great Gatsby', authors: 'F. Scott Fitzgerald' },
    { title: 'To Kill a Mockingbird', authors: 'Harper Lee' },
    { title: '1984', authors: 'George Orwell' },
  ];
  
  console.log(`Batch fetching covers for ${books.length} books...`);
  const start = performance.now();
  const covers = await coverBatchCache.fetch(books);
  const duration = performance.now() - start;
  
  console.log(`✅ Fetched ${covers.size} covers in ${duration.toFixed(0)}ms`);
  console.table(Array.from(covers.values()).map(c => ({
    title: c.title,
    coverUrl: c.coverUrl ? '✅ Found' : '❌ Not found'
  })));
  
  console.groupEnd();
}

// Usage:
// await testBatchCoverFetching()


// ─────────────────────────────────────────────────────────────────────────────
// 5. Test Sanitization (XSS Protection)
// └─ Verify dangerous content is removed

async function testSanitization() {
  const { sanitizeHtml, hasDangerousContent } = await import('@/lib/sanitize');
  
  console.group('🛡️ XSS Sanitization Test');
  
  const maliciousInput = `
    <p>This is safe</p>
    <img src=x onerror="alert('XSS')">
    <script>console.log('hack')</script>
  `;
  
  console.log('Input:', maliciousInput);
  console.log('Has dangerous content:', hasDangerousContent(maliciousInput));
  
  const safe = sanitizeHtml(maliciousInput);
  console.log('Sanitized:', safe);
  console.log('✅ Dangerous scripts removed');
  
  console.groupEnd();
}

// Usage:
// await testSanitization()


// ─────────────────────────────────────────────────────────────────────────────
// 6. Run All Tests
// └─ Comprehensive verification

async function runAllTests() {
  console.clear();
  console.log('%c🚀 PUSTARA PERFORMANCE & SECURITY TESTS', 'background: #gold; color: #000; padding: 10px; font-size: 16px; font-weight: bold;');
  
  try {
    await testCacheHitRate();
    console.log('\n');
    await testBatchCoverFetching();
    console.log('\n');
    await testSanitization();
    
    console.log('\n%c✅ All tests passed!', 'background: #28a745; color: #fff; padding: 10px; font-size: 14px;');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Usage:
// await runAllTests()


// ─────────────────────────────────────────────────────────────────────────────
// Export for use in console
const pustaraTools: PustaraTools = {
  checkCacheStats,
  monitorOpenLibraryRequests,
  testCacheHitRate,
  testBatchCoverFetching,
  testSanitization,
  runAllTests,
};

if (typeof window !== 'undefined') {
  window.pustara = pustaraTools;
}

console.log('%cℹ️  Pustara utilities ready!', 'color: #007bff; font-weight: bold;');
console.log('Available commands:');
console.log('  pustara.checkCacheStats()');
console.log('  pustara.monitorOpenLibraryRequests()');
console.log('  await pustara.testCacheHitRate()');
console.log('  await pustara.testBatchCoverFetching()');
console.log('  await pustara.testSanitization()');
console.log('  await pustara.runAllTests()');
