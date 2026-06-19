@@
   it('returns NONE when conflicting TFs', () => {
@@
     const sig = aggregateSignals('TEST', tfResults, 1, 1000);
     expect(sig.direction).toBe('NONE');
+    expect(sig.reasons.some(r => r.includes('invalid asset symbol'))).toBeTruthy();
   });
*** End Patch
