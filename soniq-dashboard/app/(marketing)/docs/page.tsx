"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Book,
  Rocket,
  Phone,
  Settings,
  Calendar,
  BarChart3,
  HelpCircle,
  ChevronRight,
  Search,
  ArrowLeft,
  Play,
  CheckCircle2,
  Clock,
  Users,
  Volume2,
  Bell,
  CreditCard,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface DocSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: { id: string; title: string }[];
}

const sections: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    items: [
      { id: "welcome", title: "Welcome to Soniq" },
      { id: "first-setup", title: "Setting Up Your Account" },
      { id: "first-call", title: "Your First AI Call" },
    ],
  },
  {
    id: "voice-agent",
    title: "Your Voice Agent",
    icon: Phone,
    items: [
      { id: "how-it-works", title: "How It Works" },
      { id: "customize-greeting", title: "Customize Your Greeting" },
      { id: "business-hours", title: "Set Business Hours" },
      { id: "choose-voice", title: "Choose a Voice" },
    ],
  },
  {
    id: "appointments",
    title: "Appointments",
    icon: Calendar,
    items: [
      { id: "calendar-setup", title: "Connect Your Calendar" },
      { id: "booking-settings", title: "Booking Settings" },
      { id: "confirmations", title: "Appointment Confirmations" },
    ],
  },
  {
    id: "calls",
    title: "Managing Calls",
    icon: Headphones,
    items: [
      { id: "call-history", title: "View Call History" },
      { id: "call-recordings", title: "Call Recordings" },
      { id: "live-takeover", title: "Take Over a Live Call" },
      { id: "voicemail", title: "Voicemail Settings" },
    ],
  },
  {
    id: "billing",
    title: "Billing & Plans",
    icon: CreditCard,
    items: [
      { id: "plans", title: "Plans & Pricing" },
      { id: "usage", title: "Track Your Usage" },
      { id: "upgrade", title: "Upgrade Your Plan" },
    ],
  },
  {
    id: "help",
    title: "Help & Support",
    icon: HelpCircle,
    items: [
      { id: "faq", title: "Frequently Asked Questions" },
      { id: "contact-support", title: "Contact Support" },
    ],
  },
];

const content: Record<string, { title: string; content: React.ReactNode }> = {
  welcome: {
    title: "Welcome to Soniq",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Soniq is your AI-powered phone assistant that answers calls for
          your business 24/7. No more missed calls, no more voicemails piling
          up.
        </p>

        <div className="rounded-xl border bg-primary/5 p-6">
          <h3 className="text-lg font-semibold mb-4">
            What Soniq Does For You
          </h3>
          <div className="space-y-3">
            <Feature
              icon={Phone}
              text="Answers every call with a friendly, professional voice"
            />
            <Feature
              icon={Calendar}
              text="Books appointments directly into your calendar"
            />
            <Feature icon={Clock} text="Works 24/7, even when you're closed" />
            <Feature
              icon={Users}
              text="Handles multiple calls at the same time"
            />
            <Feature
              icon={Bell}
              text="Sends you notifications for important calls"
            />
          </div>
        </div>

        <div className="rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
          <p className="text-muted-foreground mb-4">
            Setting up takes less than 5 minutes. Let&apos;s get your AI
            assistant ready to answer calls.
          </p>
          <Button asChild>
            <Link href="/signup">Start Free Trial</Link>
          </Button>
        </div>
      </div>
    ),
  },
  "first-setup": {
    title: "Setting Up Your Account",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Let&apos;s get your Soniq account set up. It only takes a few
          minutes.
        </p>

        <div className="space-y-6">
          <Step
            number={1}
            title="Enter your business information"
            description="Tell us your business name, industry, and location. This helps your AI assistant answer questions accurately."
          />
          <Step
            number={2}
            title="Choose your industry"
            description="Select your industry from our list (dental, salon, restaurant, etc.). We'll automatically set up common questions and responses for your type of business."
          />
          <Step
            number={3}
            title="Set your business hours"
            description="Tell us when you're open. Your AI will let callers know if you're currently open or closed."
          />
          <Step
            number={4}
            title="Get your phone number"
            description="We'll give you a new phone number for your AI assistant. You can forward your existing number to it, or use it directly."
          />
        </div>

        <Tip>
          You can change any of these settings later from your dashboard.
        </Tip>
      </div>
    ),
  },
  "first-call": {
    title: "Your First AI Call",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Once your account is set up, you can test your AI assistant right
          away.
        </p>

        <div className="rounded-xl border p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Test Your AI Assistant</h3>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground flex-shrink-0">
                1
              </span>
              <span>
                Go to your Dashboard and find your Soniq phone number
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground flex-shrink-0">
                2
              </span>
              <span>Call that number from your personal phone</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground flex-shrink-0">
                3
              </span>
              <span>
                Have a conversation! Try booking an appointment or asking about
                your business hours
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground flex-shrink-0">
                4
              </span>
              <span>
                Check your Dashboard to see the call recording and summary
              </span>
            </li>
          </ol>
        </div>

        <Tip>
          Make a few test calls to see how your AI handles different questions.
          You can adjust settings based on what you hear.
        </Tip>
      </div>
    ),
  },
  "how-it-works": {
    title: "How Your AI Assistant Works",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Your AI assistant is like having a friendly receptionist who never
          takes a break.
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Phone className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-semibold">Someone calls your number</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your AI picks up instantly with your custom greeting.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <Volume2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h4 className="font-semibold">Natural conversation</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  The AI listens, understands, and responds naturally - just
                  like a real person.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-semibold">Takes action</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Books appointments, answers questions, or takes a message -
                  whatever the caller needs.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                <Bell className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-semibold">Notifies you</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You get a summary and recording of every call in your
                  dashboard and email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  "customize-greeting": {
    title: "Customize Your Greeting",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          The greeting is the first thing callers hear. Make it sound like your
          business.
        </p>

        <div className="rounded-xl border p-6 bg-card">
          <h3 className="font-semibold mb-3">Example Greetings</h3>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-sm">
              &quot;Thanks for calling Sunny Dental! How can I help you
              today?&quot;
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              &quot;Hello, you&apos;ve reached Joe&apos;s Plumbing. Are you
              calling about a new service or an existing appointment?&quot;
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              &quot;Hi there! Thanks for calling Bella&apos;s Salon. Would you
              like to book an appointment?&quot;
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold">How to change your greeting</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li>
            1. Go to <strong>Settings</strong> in your dashboard
          </li>
          <li>
            2. Click <strong>Voice Agent</strong>
          </li>
          <li>
            3. Find the <strong>Greeting</strong> section
          </li>
          <li>
            4. Type your new greeting and click <strong>Save</strong>
          </li>
        </ol>

        <Tip>
          Keep your greeting short and friendly. Most callers just want to know
          they reached the right place.
        </Tip>
      </div>
    ),
  },
  "business-hours": {
    title: "Set Your Business Hours",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Your AI assistant can tell callers if you&apos;re open or closed, and
          handle calls differently based on the time.
        </p>

        <h3 className="text-lg font-semibold">How to set your hours</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li>
            1. Go to <strong>Settings</strong> in your dashboard
          </li>
          <li>
            2. Click <strong>Business Hours</strong>
          </li>
          <li>3. Set your open and close times for each day</li>
          <li>4. Mark any days you&apos;re closed</li>
        </ol>

        <div className="rounded-xl border p-6 bg-card">
          <h3 className="font-semibold mb-3">After-hours behavior</h3>
          <p className="text-muted-foreground text-sm mb-4">
            You can choose what happens when someone calls outside business
            hours:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Take a message and email it to you
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Let them book an appointment for the next available time
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Provide basic information and your callback hours
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  "choose-voice": {
    title: "Choose a Voice",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Pick a voice that fits your business personality. We have several
          natural-sounding options.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <h4 className="font-semibold">Female voices</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Sarah, Emma, and Jessica - warm and professional tones
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <h4 className="font-semibold">Male voices</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Michael, David, and James - friendly and clear tones
            </p>
          </div>
        </div>

        <h3 className="text-lg font-semibold">How to change your voice</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li>
            1. Go to <strong>Settings</strong> in your dashboard
          </li>
          <li>
            2. Click <strong>Voice Agent</strong>
          </li>
          <li>3. Listen to voice samples and pick your favorite</li>
          <li>
            4. Click <strong>Save</strong>
          </li>
        </ol>

        <Tip>
          Professional plan users get access to premium voices with even more
          natural-sounding speech.
        </Tip>
      </div>
    ),
  },
  "calendar-setup": {
    title: "Connect Your Calendar",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Connect your calendar so your AI can book appointments at available
          times automatically.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-semibold">Google Calendar</h4>
              <p className="text-xs text-muted-foreground">
                Connect in one click
              </p>
            </div>
          </div>
          <div className="rounded-xl border p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-blue-600/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold">Outlook Calendar</h4>
              <p className="text-xs text-muted-foreground">
                Connect in one click
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold">How to connect</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li>
            1. Go to <strong>Settings</strong> in your dashboard
          </li>
          <li>
            2. Click <strong>Calendar</strong>
          </li>
          <li>
            3. Click <strong>Connect Google</strong> or{" "}
            <strong>Connect Outlook</strong>
          </li>
          <li>4. Sign in and allow access</li>
        </ol>

        <Tip>
          Your AI will automatically check your calendar for busy times before
          booking any appointments.
        </Tip>
      </div>
    ),
  },
  "booking-settings": {
    title: "Booking Settings",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Control how appointments are booked through your AI assistant.
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <h4 className="font-semibold">Appointment duration</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Set how long each appointment should be (15 min, 30 min, 1 hour,
              etc.)
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <h4 className="font-semibold">Buffer time</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Add time between appointments so you&apos;re never double-booked
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <h4 className="font-semibold">Advance booking</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how far in advance people can book (1 week, 1 month, etc.)
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <h4 className="font-semibold">Minimum notice</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Require a minimum time before appointments (e.g., no same-day
              bookings)
            </p>
          </div>
        </div>
      </div>
    ),
  },
  confirmations: {
    title: "Appointment Confirmations",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Automatically send confirmation messages to reduce no-shows.
        </p>

        <div className="rounded-xl border p-6 bg-card">
          <h3 className="font-semibold mb-3">Confirmation options</h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Send confirmation text immediately after booking
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Send reminder 24 hours before appointment
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Send reminder 1 hour before appointment
            </li>
          </ul>
        </div>

        <Tip>
          SMS confirmations are included in Professional and Enterprise plans.
        </Tip>
      </div>
    ),
  },
  "call-history": {
    title: "View Call History",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          See every call your AI has handled, with full details and recordings.
        </p>

        <h3 className="text-lg font-semibold">
          What you&apos;ll see for each call
        </h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Caller&apos;s phone number
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Date and time of the call
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            How long the call lasted
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            What the caller wanted (appointment, question, etc.)
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Summary of the conversation
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Full recording you can listen to
          </li>
        </ul>

        <h3 className="text-lg font-semibold mt-6">How to view calls</h3>
        <p className="text-muted-foreground">
          Click <strong>Calls</strong> in the left sidebar of your dashboard to
          see all your recent calls.
        </p>
      </div>
    ),
  },
  "call-recordings": {
    title: "Call Recordings",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Every call is recorded so you can hear exactly what was said.
        </p>

        <h3 className="text-lg font-semibold">Listening to recordings</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li>
            1. Go to <strong>Calls</strong> in your dashboard
          </li>
          <li>2. Click on any call to open the details</li>
          <li>
            3. Click the <strong>Play</strong> button to listen
          </li>
        </ol>

        <div className="rounded-xl border p-6 bg-card">
          <h3 className="font-semibold mb-3">Recording storage</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Starter:</strong> Recordings kept for 30 days
            </li>
            <li>
              <strong>Professional:</strong> Recordings kept for 90 days
            </li>
            <li>
              <strong>Enterprise:</strong> Unlimited storage
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  "live-takeover": {
    title: "Take Over a Live Call",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Sometimes you want to jump in and talk to a caller yourself. Live
          takeover lets you do that.
        </p>

        <h3 className="text-lg font-semibold">How it works</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li>1. You&apos;ll get a notification when a call is in progress</li>
          <li>
            2. Click <strong>Take Over</strong> if you want to join
          </li>
          <li>3. Your AI will smoothly hand off to you</li>
          <li>4. Continue the conversation from your phone</li>
        </ol>

        <Tip>
          Live takeover is available on Professional and Enterprise plans.
        </Tip>
      </div>
    ),
  },
  voicemail: {
    title: "Voicemail Settings",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          When callers want to leave a message, your AI will record it and send
          it to you.
        </p>

        <div className="rounded-xl border p-6 bg-card">
          <h3 className="font-semibold mb-3">Voicemail features</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Recorded message from the caller
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Written transcript of what they said
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Email notification with the voicemail
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Caller&apos;s phone number for easy callback
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  plans: {
    title: "Plans & Pricing",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Choose the plan that fits your business.
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border p-5">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold">Starter</h4>
              <span className="text-xl font-bold">
                $99
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Great for small businesses just getting started.
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>300 calls per month included</li>
              <li>$0.08/min for extra calls</li>
              <li>1 phone number</li>
              <li>Email support</li>
            </ul>
          </div>

          <div className="rounded-xl border border-primary p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">Professional</h4>
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  Most Popular
                </span>
              </div>
              <span className="text-xl font-bold">
                $199
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              For growing businesses that need more features.
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>1,000 calls per month included</li>
              <li>$0.08/min for extra calls</li>
              <li>3 phone numbers</li>
              <li>SMS confirmations</li>
              <li>Live call takeover</li>
              <li>Priority support</li>
            </ul>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold">Enterprise</h4>
              <span className="text-xl font-bold">Custom</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              For large businesses with custom needs.
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Unlimited calls</li>
              <li>Unlimited phone numbers</li>
              <li>Dedicated support</li>
              <li>Custom setup</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  usage: {
    title: "Track Your Usage",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Keep track of how many calls you&apos;ve used this month.
        </p>

        <h3 className="text-lg font-semibold">Where to check</h3>
        <p className="text-muted-foreground">
          Go to <strong>Settings</strong> then <strong>Billing</strong> to see:
        </p>
        <ul className="space-y-2 text-muted-foreground mt-3">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Calls used this month
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Calls remaining in your plan
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Extra usage charges (if any)
          </li>
        </ul>

        <Tip>
          We&apos;ll email you when you&apos;re getting close to your monthly
          limit.
        </Tip>
      </div>
    ),
  },
  upgrade: {
    title: "Upgrade Your Plan",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Need more calls or features? Upgrade anytime.
        </p>

        <h3 className="text-lg font-semibold">How to upgrade</h3>
        <ol className="space-y-2 text-muted-foreground">
          <li>
            1. Go to <strong>Settings</strong> in your dashboard
          </li>
          <li>
            2. Click <strong>Billing</strong>
          </li>
          <li>
            3. Click <strong>Upgrade Plan</strong>
          </li>
          <li>4. Choose your new plan</li>
        </ol>

        <div className="rounded-xl border p-6 bg-card">
          <h3 className="font-semibold mb-2">What happens when you upgrade?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Your new features are available immediately</li>
            <li>
              You&apos;ll be charged the difference for the rest of the month
            </li>
            <li>Next month you&apos;ll be charged the new plan rate</li>
          </ul>
        </div>
      </div>
    ),
  },
  faq: {
    title: "Frequently Asked Questions",
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <FAQ
            question="Can I keep my existing business phone number?"
            answer="Yes! You can forward your existing number to your Soniq number, or we can help you port your number over completely."
          />
          <FAQ
            question="What if I want to answer a call myself?"
            answer="Your AI handles calls automatically, but you can take over any live call with one click. You can also set up rules for when to transfer directly to you."
          />
          <FAQ
            question="How does the AI know about my business?"
            answer="You'll set up your business information during signup. The AI uses this to answer questions accurately. You can update this anytime."
          />
          <FAQ
            question="What happens if I run out of calls?"
            answer="Your AI keeps working! Extra calls are charged at $0.08 per minute. You can upgrade your plan anytime if you need more calls."
          />
          <FAQ
            question="Can I cancel anytime?"
            answer="Yes, you can cancel your subscription at any time. You'll have access until the end of your billing period."
          />
          <FAQ
            question="Is there a free trial?"
            answer="Yes! Every plan comes with a 14-day free trial. No credit card required to start."
          />
        </div>
      </div>
    ),
  },
  "contact-support": {
    title: "Contact Support",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Need help? We&apos;re here for you.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-5">
            <h4 className="font-semibold mb-2">Email Support</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Send us an email and we&apos;ll get back to you within 24 hours.
            </p>
            <p className="text-primary font-medium">support@soniq.ai</p>
          </div>
          <div className="rounded-xl border p-5">
            <h4 className="font-semibold mb-2">Live Chat</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Professional and Enterprise plans get live chat support.
            </p>
            <p className="text-sm text-muted-foreground">
              Available Mon-Fri, 9am-6pm EST
            </p>
          </div>
        </div>
      </div>
    ),
  },
};

function Feature({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {number}
        </div>
      </div>
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Tip:</strong> {children}
      </p>
    </div>
  );
}

function FAQ({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-xl border p-4">
      <h4 className="font-semibold">{question}</h4>
      <p className="text-sm text-muted-foreground mt-2">{answer}</p>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("welcome");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentContent = content[activeSection] || content.welcome;

  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-semibold">Soniq</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">Help Center</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link href="/signup">
              <Button size="sm">Start Free Trial</Button>
            </Link>
          </div>
          <button
            className="md:hidden"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <Book className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 transform bg-background border-r pt-16 transition-transform duration-200 md:translate-x-0",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="p-4 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <nav className="h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-6">
            {filteredSections.map((section) => (
              <div key={section.id}>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <section.icon className="h-4 w-4" />
                  {section.title}
                </div>
                <ul className="space-y-1 ml-6">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setActiveSection(item.id);
                          setMobileNavOpen(false);
                        }}
                        className={cn(
                          "w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors flex items-center gap-2",
                          activeSection === item.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted",
                        )}
                      >
                        {activeSection === item.id && (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span
                          className={activeSection !== item.id ? "ml-5" : ""}
                        >
                          {item.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 md:ml-64">
          <div className="max-w-3xl mx-auto px-4 py-12">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-bold mb-6">
                {currentContent.title}
              </h1>
              {currentContent.content}
            </motion.div>

            {/* Navigation */}
            <div className="mt-12 pt-6 border-t flex justify-between">
              <NavigationButton
                direction="prev"
                activeSection={activeSection}
                sections={sections}
                onNavigate={setActiveSection}
              />
              <NavigationButton
                direction="next"
                activeSection={activeSection}
                sections={sections}
                onNavigate={setActiveSection}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavigationButton({
  direction,
  activeSection,
  sections: sectionsList,
  onNavigate,
}: {
  direction: "prev" | "next";
  activeSection: string;
  sections: DocSection[];
  onNavigate: (id: string) => void;
}) {
  const allItems = sectionsList.flatMap((s) => s.items);
  const currentIndex = allItems.findIndex((item) => item.id === activeSection);
  const targetIndex =
    direction === "prev" ? currentIndex - 1 : currentIndex + 1;
  const targetItem = allItems[targetIndex];

  if (!targetItem) return <div />;

  return (
    <button
      onClick={() => onNavigate(targetItem.id)}
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors",
        direction === "next" && "flex-row-reverse",
      )}
    >
      {direction === "prev" ? (
        <ArrowLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
      {targetItem.title}
    </button>
  );
}
