import {
  Navbar,
  HeroSection,
  FeaturesSection,
  PricingSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  Footer,
} from "@/components/landing";
import { DemoProvider } from "@/components/demo";

export default function LandingPage() {
  return (
    <DemoProvider>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </DemoProvider>
  );
}
