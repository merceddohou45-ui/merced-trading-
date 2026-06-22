"use client";

import { useState } from "react";

export default function Home() {
  const [capital, setCapital] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [risk, setRisk] = useState("medium");

  return (
    <main style={styles.body}>
      {/* BACKGROUND GLOW */}
      <div style={styles.bgGlow}></div>

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.logo}>🤖📊</div>

        <h1 style={styles.title}>Merced’s Trading Bot</h1>

        <p style={styles.subtitle}>
          L’intelligence artificielle qui analyse les marchés et génère des décisions de trading en temps réel.
        </p>

        <p style={styles.smallText}>
          Forex • Crypto • Or • Indices • Multi-timeframes • Risk Engine IA
        </p>
      </section>

      {/* ONBOARDING */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>🧠 Onboarding Trader</h2>

        <label style={styles.label}>Capital de trading</label>
        <input
          style={styles.input}
          placeholder="Ex: 1000"
          value={capital}
          onChange={(e) => setCapital(e.target.value)}
        />

        <label style={styles.label}>Devise</label>
        <select
          style={styles.input}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          <option>USD</option>
          <option>EUR</option>
          <option>GBP</option>
        </select>

        <label style={styles.label}>Niveau de risque</label>
        <select
          style={styles.input}
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
        >
          <option value="low">Conservateur</option>
          <option value="medium">Moyen</option>
          <option value="high">Agressif</option>
        </select>

        <button style={styles.button}>
          🚀 Démarrer l’analyse IA
        </button>
      </section>

      {/* ENGINE */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>⚙️ IA Trading Engine</h2>

        <div style={styles.tags}>
          <span style={styles.tag}>RSI (14)</span>
          <span style={styles.tag}>Stochastic (5,3,3)</span>
          <span style={styles.tag}>StdDev (20)</span>
        </div>

        <p style={styles.text}>
          Multi-timeframes: M1 • M5 • M15 • H1 • H4 • D1
        </p>
      </section>

      {/* LIVE SIGNAL */}
      <section style={styles.signalCard}>
        <h2 style={styles.cardTitle}>📊 Signal Live</h2>

        <h3 style={{ color: "#00ff88" }}>XAUUSD</h3>

        <p>📈 Achat</p>
        <p>Entry: 2365.20</p>
        <p>SL: 2358.00</p>
        <p>TP1: 2372.00</p>
        <p>TP2: 2378.00</p>
        <p>TP3: 2385.00</p>
        <p>Confidence: 84%</p>

        <div style={styles.analysis}>
          <p>🧠 RSI neutre</p>
          <p>📉 Cassure résistance H1</p>
          <p>🚀 Momentum haussier</p>
        </div>
      </section>

      {/* NOTIFICATION */}
      <section style={styles.success}>
        🎉 Trade réussi !
        <br />
        XAUUSD a touché TP2 📈🔥
      </section>

      {/* DISCLAIMER */}
      <footer style={styles.footer}>
        ⚠️ Trading comporte des risques. Aucun profit n’est garanti.
      </footer>
    </main>
  );
}

/* 🎨 STYLES */
const styles: any = {
  body: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "white",
    fontFamily: "Arial",
    padding: 20,
    overflowX: "hidden",
  },

  bgGlow: {
    position: "absolute",
    top: "-200px",
    left: "-200px",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, #6a00ff, transparent)",
    filter: "blur(100px)",
  },

  hero: {
    textAlign: "center",
    marginTop: 40,
    marginBottom: 40,
  },

  logo: {
    fontSize: 50,
  },

  title: {
    fontSize: 40,
    fontWeight: "bold",
    background: "linear-gradient(90deg, #00ff88, #6a00ff)",
    WebkitBackgroundClip: "text",
    color: "transparent",
  },

  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginTop: 10,
  },

  smallText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 5,
  },

  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    backdropFilter: "blur(10px)",
  },

  signalCard: {
    background: "rgba(0,255,136,0.08)",
    border: "1px solid rgba(0,255,136,0.3)",
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },

  success: {
    marginTop: 20,
    padding: 15,
    background: "rgba(0,255,136,0.15)",
    borderRadius: 10,
    textAlign: "center",
  },

  footer: {
    marginTop: 40,
    fontSize: 12,
    opacity: 0.5,
    textAlign: "center",
  },

  cardTitle: {
    marginBottom: 10,
  },

  label: {
    display: "block",
    marginTop: 10,
    marginBottom: 5,
    fontSize: 12,
    opacity: 0.8,
  },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(0,0,0,0.3)",
    color: "white",
  },

  button: {
    marginTop: 15,
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg, #00ff88, #6a00ff)",
    color: "black",
    fontWeight: "bold",
    cursor: "pointer",
  },

  tags: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  tag: {
    padding: "5px 10px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.1)",
    fontSize: 12,
  },

  text: {
    marginTop: 10,
    opacity: 0.7,
  },

  analysis: {
    marginTop: 10,
    fontSize: 13,
    opacity: 0.9,
  },
};
