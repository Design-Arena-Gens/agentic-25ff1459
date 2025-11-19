"use client";

import { useState, useEffect, useRef } from "react";

interface Project {
  id: number;
  name: string;
  target: number;
  risk: number;
  expectedReturn: number;
  raised: number;
  status: "funding" | "active" | "success" | "failed";
  actualReturn?: number;
}

interface Investor {
  id: number;
  emoji: string;
  money: number;
  initialMoney: number;
  investDirect: boolean;
}

interface MoneyParticle {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  amount: number;
  phase: "toProject" | "toRecipient";
  fromInvestor?: number;
  toProject?: number;
}

export default function Home() {
  const [speed, setSpeed] = useState(1);
  const [cycle, setCycle] = useState(0);
  const [investors, setInvestors] = useState<Investor[]>([
    { id: 1, emoji: "👨", money: 100, initialMoney: 100, investDirect: true },
    { id: 2, emoji: "👩", money: 100, initialMoney: 100, investDirect: true },
    { id: 3, emoji: "🧑", money: 100, initialMoney: 100, investDirect: false },
    { id: 4, emoji: "👴", money: 100, initialMoney: 100, investDirect: false },
    { id: 5, emoji: "👵", money: 100, initialMoney: 100, investDirect: false },
    { id: 6, emoji: "🧔", money: 100, initialMoney: 100, investDirect: false },
  ]);

  const [etfPool, setEtfPool] = useState(0);
  const [projects, setProjects] = useState<Project[]>([
    { id: 1, name: "Tech Startup", target: 50, risk: 0.3, expectedReturn: 1.5, raised: 0, status: "funding" },
    { id: 2, name: "Real Estate", target: 80, risk: 0.1, expectedReturn: 1.2, raised: 0, status: "funding" },
    { id: 3, name: "Biotech", target: 120, risk: 0.5, expectedReturn: 2.0, raised: 0, status: "funding" },
    { id: 4, name: "Green Energy", target: 100, risk: 0.25, expectedReturn: 1.4, raised: 0, status: "funding" },
  ]);

  const [particles, setParticles] = useState<MoneyParticle[]>([]);
  const animationRef = useRef<number>();
  const phaseRef = useRef<"collecting" | "investing" | "returning">("collecting");
  const phaseTimerRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      const deltaTime = 16 * speed; // ~60fps baseline
      phaseTimerRef.current += deltaTime;

      // Phase transitions
      if (phaseRef.current === "collecting" && phaseTimerRef.current > 2000) {
        phaseRef.current = "investing";
        phaseTimerRef.current = 0;
        startInvestingPhase();
      } else if (phaseRef.current === "investing" && phaseTimerRef.current > 3000) {
        phaseRef.current = "returning";
        phaseTimerRef.current = 0;
        startReturningPhase();
      } else if (phaseRef.current === "returning" && phaseTimerRef.current > 3000) {
        phaseRef.current = "collecting";
        phaseTimerRef.current = 0;
        setCycle(c => c + 1);
        resetForNextCycle();
      }

      // Update particle positions
      setParticles(prevParticles => {
        return prevParticles.map(p => {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 5) {
            return { ...p, x: p.targetX, y: p.targetY };
          }

          const moveSpeed = 3 * speed;
          const ratio = moveSpeed / dist;

          return {
            ...p,
            x: p.x + dx * ratio,
            y: p.y + dy * ratio,
          };
        }).filter(p => {
          const arrived = Math.abs(p.x - p.targetX) < 5 && Math.abs(p.y - p.targetY) < 5;
          return !arrived;
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [speed]);

  const startInvestingPhase = () => {
    const newParticles: MoneyParticle[] = [];
    const directInvestors = investors.filter(inv => inv.investDirect);
    const etfInvestors = investors.filter(inv => !inv.investDirect);

    // Collect money to ETF from ETF investors
    const etfContribution = etfInvestors.reduce((sum, inv) => sum + inv.money * 0.2, 0);
    setEtfPool(etfContribution);

    setInvestors(prev => prev.map(inv => ({
      ...inv,
      money: inv.investDirect ? inv.money * 0.8 : inv.money * 0.8
    })));

    // Direct investors pick random projects
    directInvestors.forEach((inv, idx) => {
      const projectIdx = Math.floor(Math.random() * projects.length);
      const investAmount = inv.money * 0.2;

      for (let i = 0; i < 3; i++) {
        newParticles.push({
          id: `invest-direct-${inv.id}-${i}`,
          x: 100,
          y: 150 + idx * 80,
          targetX: 400 + projectIdx * 200,
          targetY: 300,
          amount: investAmount / 3,
          phase: "toProject",
          fromInvestor: inv.id,
          toProject: projects[projectIdx].id,
        });
      }
    });

    // ETF invests in ALL projects that meet target
    projects.forEach((proj, idx) => {
      const etfInvestPerProject = etfContribution / projects.length;

      for (let i = 0; i < 3; i++) {
        newParticles.push({
          id: `invest-etf-${proj.id}-${i}`,
          x: 100,
          y: 400,
          targetX: 400 + idx * 200,
          targetY: 300,
          amount: etfInvestPerProject / 3,
          phase: "toProject",
          toProject: proj.id,
        });
      }
    });

    setParticles(newParticles);

    // Update project raised amounts
    setTimeout(() => {
      setProjects(prev => prev.map(proj => {
        const directInvestment = directInvestors
          .filter(() => Math.random() > 0.5)
          .reduce((sum, inv) => sum + inv.initialMoney * 0.2, 0);
        const etfInvestment = etfContribution / projects.length;
        const totalRaised = proj.raised + directInvestment + etfInvestment;

        let status: Project["status"] = "funding";
        let actualReturn: number | undefined;

        if (totalRaised >= proj.target) {
          const success = Math.random() > proj.risk;
          status = success ? "success" : "failed";
          actualReturn = success ? proj.expectedReturn : 0;
        }

        return { ...proj, raised: totalRaised, status, actualReturn };
      }));
    }, 2000);
  };

  const startReturningPhase = () => {
    const newParticles: MoneyParticle[] = [];

    // Return money from successful projects
    const successfulProjects = projects.filter(p => p.status === "success");
    const etfInvestors = investors.filter(inv => !inv.investDirect);

    let totalEtfReturns = 0;

    successfulProjects.forEach((proj, idx) => {
      const returnAmount = proj.raised * (proj.actualReturn || 1);
      const etfPortion = returnAmount / 2; // Assume half from ETF
      const directPortion = returnAmount / 2;

      totalEtfReturns += etfPortion;

      // Return to direct investors
      investors.filter(inv => inv.investDirect).forEach((inv, invIdx) => {
        if (Math.random() > 0.5) {
          newParticles.push({
            id: `return-direct-${proj.id}-${inv.id}`,
            x: 400 + idx * 200,
            y: 300,
            targetX: 100,
            targetY: 150 + invIdx * 80,
            amount: directPortion / 2,
            phase: "toRecipient",
          });
        }
      });
    });

    // ETF returns to ETF pool first
    successfulProjects.forEach((proj, idx) => {
      newParticles.push({
        id: `return-etf-${proj.id}`,
        x: 400 + idx * 200,
        y: 300,
        targetX: 100,
        targetY: 400,
        amount: totalEtfReturns / successfulProjects.length,
        phase: "toRecipient",
      });
    });

    // ETF distributes to investors
    setTimeout(() => {
      etfInvestors.forEach((inv, idx) => {
        const share = totalEtfReturns / etfInvestors.length;
        newParticles.push({
          id: `etf-distribute-${inv.id}`,
          x: 100,
          y: 400,
          targetX: 100,
          targetY: 150 + (investors.findIndex(i => i.id === inv.id)) * 80,
          amount: share,
          phase: "toRecipient",
        });
      });

      setInvestors(prev => prev.map(inv => {
        if (inv.investDirect) {
          const returns = successfulProjects.reduce((sum, proj) => {
            if (Math.random() > 0.5) {
              return sum + (proj.raised * (proj.actualReturn || 1)) / 4;
            }
            return sum;
          }, 0);
          return { ...inv, money: inv.money + returns };
        } else {
          const share = totalEtfReturns / etfInvestors.length;
          return { ...inv, money: inv.money + share };
        }
      }));
    }, 1500);

    setParticles(newParticles);
  };

  const resetForNextCycle = () => {
    setProjects(prev => prev.map(proj => ({
      ...proj,
      raised: 0,
      status: "funding",
      actualReturn: undefined,
    })));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          Why Investing Works
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Watch how ETF investing diversifies risk and provides consistent returns
        </p>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-4">
            <label className="font-semibold text-gray-700">Animation Speed:</label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-gray-600 font-mono w-12">{speed.toFixed(1)}x</span>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-semibold">Cycle:</span> {cycle} |
            <span className="font-semibold ml-4">Phase:</span> {phaseRef.current}
          </div>
        </div>

        {/* Main Visualization */}
        <div className="bg-white rounded-lg shadow-md p-8 relative" style={{ minHeight: "600px" }}>
          {/* Investors */}
          <div className="absolute left-8 top-20">
            <h3 className="font-bold text-lg mb-4 text-gray-700">Investors</h3>
            {investors.map((inv, idx) => (
              <div key={inv.id} className="flex items-center gap-3 mb-4">
                <div className="text-4xl">{inv.emoji}</div>
                <div className="bg-green-100 px-3 py-2 rounded-lg">
                  <div className="text-xs text-gray-600">
                    {inv.investDirect ? "Direct" : "ETF"}
                  </div>
                  <div className="font-bold text-green-700">
                    ${inv.money.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({((inv.money / inv.initialMoney - 1) * 100).toFixed(0)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ETF Pool */}
          <div className="absolute left-8 bottom-32">
            <div className="bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg">
              <div className="text-xl font-bold">ETF Pool</div>
              <div className="text-2xl font-mono">${etfPool.toFixed(0)}M</div>
              <div className="text-xs opacity-80">Diversified Investment</div>
            </div>
          </div>

          {/* Projects */}
          <div className="absolute right-8 top-20 flex gap-8">
            {projects.map((proj, idx) => (
              <div key={proj.id} className="w-40">
                <div className={`p-4 rounded-lg shadow-md ${
                  proj.status === "success" ? "bg-green-100 border-2 border-green-500" :
                  proj.status === "failed" ? "bg-red-100 border-2 border-red-500" :
                  proj.raised >= proj.target ? "bg-yellow-100 border-2 border-yellow-500" :
                  "bg-gray-100"
                }`}>
                  <div className="font-bold text-sm mb-2">{proj.name}</div>
                  <div className="text-xs text-gray-600 mb-1">
                    Target: ${proj.target}M
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    Raised: ${proj.raised.toFixed(0)}M
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (proj.raised / proj.target) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600">
                    Risk: {(proj.risk * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">
                    Return: {(proj.expectedReturn * 100).toFixed(0)}%
                  </div>
                  {proj.status !== "funding" && (
                    <div className={`text-xs font-bold mt-2 ${
                      proj.status === "success" ? "text-green-600" : "text-red-600"
                    }`}>
                      {proj.status === "success" ? "✓ Success!" : "✗ Failed"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Money Particles */}
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-6 h-6 bg-yellow-400 rounded-full shadow-lg transition-all flex items-center justify-center text-xs font-bold"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              💰
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-700">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold text-blue-600">Direct Investors (👨👩)</div>
              <p className="text-gray-600">Invest directly in random individual projects. Higher risk, higher potential reward.</p>
            </div>
            <div>
              <div className="font-semibold text-indigo-600">ETF Investors (🧑👴👵🧔)</div>
              <p className="text-gray-600">Invest through ETF pool. Money is diversified across ALL projects that meet targets.</p>
            </div>
            <div>
              <div className="font-semibold text-green-600">Projects</div>
              <p className="text-gray-600">Must reach target to launch. Success rate = (1 - risk). Returns multiply investment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
