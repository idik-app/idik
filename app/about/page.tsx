"use client";
import {
  Header,
  HeroIdentity,
  PhilosophyTriad,
  ArchitectureMap,
  EvolutionTimeline,
  SynergyQuote,
  Footer,
} from "@/components/about";

export default function AboutPage() {
  return (
    <div className="bg-black text-cyan-200">
      <Header />
      <HeroIdentity />
      <PhilosophyTriad />
      <ArchitectureMap />
      <EvolutionTimeline />
      <SynergyQuote />
      <Footer />
    </div>
  );
}
