@@
 export function aggregateSignals(
@@
-  const confidence = maxPossibleWeighted === 0 ? 0 : Math.round(Math.min(100, ( (weightedBuy + weightedSell) / maxPossibleWeighted) * 100));
+  const confidence = maxPossibleWeighted === 0 ? 0 : Math.round(Math.min(100, ( (weightedBuy + weightedSell) / maxPossibleWeighted) * 100));
+
+  // Validate asset symbol strictly: only raw broker symbols allowed
+  // Use conservative validation: uppercase letters and digits only
+  function isValidSymbol(sym: string) {
+    return typeof sym === 'string' && /^[A-Z0-9]{3,12}$/.test(sym);
+  }
+
+  if (!isValidSymbol(asset)) {
+    reasons.push(`invalid asset symbol: ${asset} - only raw broker symbols allowed`);
+    return {
+      asset,
+      direction: 'NONE',
+      entry: null,
+      stopLoss: null,
+      takeProfits: [],
+      riskPct: userRiskPct,
+      confidence,
+      reasons,
+      meta: { scoreBreakdown: breakdown, timestamp: new Date().toISOString() },
+    };
+  }
@@
 }
