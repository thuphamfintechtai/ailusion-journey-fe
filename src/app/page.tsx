import { Hero } from "@/components/home/hero"
import {
  Destinations,
  HowItWorks,
  SeasonPromo,
  SiteFooter,
  TravelStyles,
  WhyUs,
} from "@/components/home/sections"
import { SiteNav } from "@/components/home/site-nav"

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <WhyUs />
        <SeasonPromo />
        <Destinations />
        <TravelStyles />
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  )
}
