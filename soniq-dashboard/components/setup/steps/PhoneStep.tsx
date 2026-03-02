"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowLeftRight,
  PhoneForwarded,
  Server,
  Check,
  ArrowLeft,
  Search,
  Clock,
  CheckCircle,
  Loader2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSetup } from "../SetupContext";
import { SelectionCard } from "../SelectionCard";
import { get, post } from "@/lib/api/client";
import type { PhoneSetupType } from "@/types";

// Texas area codes first, then common US codes
const AREA_CODES = [
  { code: "512", region: "Austin" },
  { code: "214", region: "Dallas" },
  { code: "713", region: "Houston" },
  { code: "210", region: "San Antonio" },
  { code: "817", region: "Fort Worth" },
  { code: "469", region: "Dallas" },
  { code: "972", region: "Dallas" },
  { code: "281", region: "Houston" },
  { code: "832", region: "Houston" },
  { code: "737", region: "Austin" },
];

const CARRIERS = [
  { id: "att", name: "AT&T" },
  { id: "verizon", name: "Verizon" },
  { id: "tmobile", name: "T-Mobile" },
  { id: "sprint", name: "Sprint" },
  { id: "other", name: "Other" },
];

// Conditional forwarding: only when busy or unanswered (not *72 unconditional)
const FORWARDING_INSTRUCTIONS: Record<
  string,
  { steps: string[]; note?: string }
> = {
  att: {
    steps: [
      "From your business phone, dial *92",
      "Enter the forwarding number shown below",
      "Wait for confirmation tone, then hang up",
    ],
    note: "This forwards calls only when you don't answer. To also forward when busy, dial *67 and enter the same number.",
  },
  verizon: {
    steps: [
      "Dial *71 from your phone to forward when busy",
      "Enter the forwarding number shown below",
      "For no-answer forwarding, use the My Verizon app or call 611",
    ],
    note: "Verizon requires separate setup for busy vs no-answer forwarding.",
  },
  tmobile: {
    steps: [
      "For no-answer: dial **61*FORWARDING_NUMBER# and press Call",
      "For busy: dial **67*FORWARDING_NUMBER# and press Call",
      "Replace FORWARDING_NUMBER with the number shown below",
    ],
    note: "You can also set this up in the T-Mobile app under Call Settings.",
  },
  sprint: {
    steps: [
      "Dial *73 from your phone",
      "Enter the forwarding number shown below",
      "Wait for two beeps to confirm",
    ],
    note: "Sprint uses *73 for conditional forwarding (busy/no-answer).",
  },
  other: {
    steps: [
      "Contact your carrier and ask for 'conditional call forwarding'",
      "Request forwarding when busy AND when unanswered",
      "Provide the forwarding number shown below",
    ],
    note: "Most carriers can set this up over the phone in a few minutes. Ask specifically for 'forward on busy' and 'forward on no answer'.",
  },
};

interface PhoneOption {
  type: PhoneSetupType;
  title: string;
  description: string;
  timeline: string;
  icon: React.ElementType;
}

const PHONE_OPTIONS: PhoneOption[] = [
  {
    type: "new",
    title: "Get a new number",
    description: "We'll provision a dedicated phone number for your assistant",
    timeline: "Ready in minutes",
    icon: Plus,
  },
  {
    type: "port",
    title: "Port my existing number",
    description: "Transfer your current business number to our service",
    timeline: "Takes 5-15 business days",
    icon: ArrowLeftRight,
  },
  {
    type: "forward",
    title: "Forward calls to us",
    description: "Keep your number and forward calls to your assistant",
    timeline: "Ready in minutes",
    icon: PhoneForwarded,
  },
  {
    type: "sip",
    title: "SIP Trunk",
    description: "Connect your existing phone system via SIP",
    timeline: "Ready after PBX config",
    icon: Server,
  },
];

export function PhoneStep() {
  const router = useRouter();
  const { state, dispatch, saveStep, goToNextStep, goToPreviousStep } =
    useSetup();

  // Destructure phone data first so it's available for state initialization
  const { setupType, number, areaCode, portRequest } = state.phoneData;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // New number state
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [numberSearchError, setNumberSearchError] = useState<string | null>(
    null,
  );
  const [provisioningNumber, setProvisioningNumber] = useState(false);
  const [numberProvisioned, setNumberProvisioned] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // Port state
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [useTempNumber, setUseTempNumber] = useState(true);
  const [portSubmitting, setPortSubmitting] = useState(false);
  const [portSubmitted, setPortSubmitted] = useState(false);
  const [portError, setPortError] = useState<string | null>(null);
  const [portTempNumber, setPortTempNumber] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [pin, setPin] = useState("");

  // Forward state
  const [forwardCarrier, setForwardCarrier] = useState("att");
  const [forwardStatus, setForwardStatus] = useState<
    "idle" | "provisioning" | "provisioned" | "verified" | "error"
  >("idle");
  const [forwardNumber, setForwardNumber] = useState<string | null>(null);
  const [forwardError, setForwardError] = useState<string | null>(null);
  // Separate state for the business number input (not persisted -- only used to call the API)
  const [businessNumber, setBusinessNumber] = useState("");

  // Restore state from loaded config (runs after loadProgress completes)
  useEffect(() => {
    if (setupType === "forward" && number !== "" && forwardStatus === "idle") {
      setForwardNumber(number);
      setForwardStatus("provisioned");
    }
    if (setupType === "new" && number !== "" && !numberProvisioned) {
      setNumberProvisioned(true);
    }
  }, [setupType, number]); // eslint-disable-line react-hooks/exhaustive-deps

  // SIP state
  const [creatingSip, setCreatingSip] = useState(false);
  const [sipCredentials, setSipCredentials] = useState<{
    sipUri: string;
    username: string;
    password: string;
  } | null>(null);
  const [sipStatus, setSipStatus] = useState<
    "idle" | "creating" | "created" | "connected" | "error"
  >("idle");
  const [sipError, setSipError] = useState<string | null>(null);

  const canContinue = setupType !== null;

  const handleSetupTypeSelect = (type: PhoneSetupType) => {
    dispatch({
      type: "SET_PHONE_DATA",
      payload: { setupType: type },
    });
    // Reset other fields when changing type
    setAvailableNumbers([]);
    setNumberProvisioned(false);
    setProvisionError(null);
    setForwardStatus("idle");
    setForwardNumber(null);
    setForwardError(null);
    setPortSubmitted(false);
    setPortError(null);
    setSipStatus("idle");
    setSipCredentials(null);
    setSipError(null);
  };

  // ---- New Number Flow ----

  const searchNumbers = async () => {
    if (!areaCode) return;

    setSearchingNumbers(true);
    setNumberSearchError(null);
    setNumberProvisioned(false);
    setProvisionError(null);
    try {
      const data = await get<{ numbers: string[] }>(
        `/api/phone/available?areaCode=${areaCode}`,
      );
      setAvailableNumbers(data.numbers || []);
    } catch {
      setAvailableNumbers([]);
      setNumberSearchError(
        "Could not fetch available numbers right now. Please try again.",
      );
    } finally {
      setSearchingNumbers(false);
    }
  };

  const handleProvisionNumber = async () => {
    if (!number) return;

    setProvisioningNumber(true);
    setProvisionError(null);
    try {
      const data = await post<{ success: boolean; phoneNumber: string }>(
        "/api/phone/provision",
        { phoneNumber: number },
      );
      if (data.success) {
        setNumberProvisioned(true);
        dispatch({
          type: "SET_PHONE_DATA",
          payload: { number: data.phoneNumber },
        });
      }
    } catch {
      setProvisionError("Failed to provision number. Please try again.");
    } finally {
      setProvisioningNumber(false);
    }
  };

  // ---- Port Number Flow ----

  const handleSubmitPort = async () => {
    if (
      !portRequest?.phone_number ||
      !portRequest?.current_carrier ||
      !portRequest?.authorized_name
    )
      return;

    setPortSubmitting(true);
    setPortError(null);
    try {
      const data = await post<{
        success: boolean;
        portRequestId: string;
        temporaryNumber: string | null;
      }>("/api/phone/port", {
        phone_number: portRequest.phone_number,
        current_carrier: portRequest.current_carrier,
        account_number: accountNumber || undefined,
        pin: pin || undefined,
        authorized_name: portRequest.authorized_name,
        use_temp_number: useTempNumber,
      });

      if (data.success) {
        setPortSubmitted(true);
        setPortTempNumber(data.temporaryNumber);
        if (data.temporaryNumber) {
          dispatch({
            type: "SET_PHONE_DATA",
            payload: { number: data.temporaryNumber },
          });
        }
      }
    } catch {
      setPortError("Failed to submit port request. Please try again.");
    } finally {
      setPortSubmitting(false);
    }
  };

  // ---- Forward Flow ----

  const handleSetupForward = async () => {
    if (!businessNumber) return;

    setForwardStatus("provisioning");
    setForwardError(null);
    try {
      const data = await post<{
        success: boolean;
        forwardTo: string;
        instructions: string;
      }>("/api/phone/forward", { business_number: businessNumber });

      if (data.success) {
        setForwardNumber(data.forwardTo);
        setForwardStatus("provisioned");
        // Persist the forwarding number so it survives page refresh
        // (the backend already saved it to phone_configurations + tenants.phone_number)
        dispatch({
          type: "SET_PHONE_DATA",
          payload: { number: data.forwardTo },
        });
      } else {
        setForwardStatus("error");
        setForwardError("Failed to set up forwarding number.");
      }
    } catch {
      setForwardStatus("error");
      setForwardError(
        "Failed to provision forwarding number. Please try again.",
      );
    }
  };

  const handleVerifyForward = async () => {
    try {
      const data = await post<{ success: boolean }>(
        "/api/phone/verify-forward",
      );
      if (data.success) {
        setForwardStatus("verified");
      }
    } catch {
      // Non-fatal: still allow continue
    }
  };

  // ---- SIP Flow ----

  const handleCreateSip = async () => {
    setCreatingSip(true);
    setSipStatus("creating");
    setSipError(null);
    try {
      const data = await post<{
        success: boolean;
        sipUri: string;
        username: string;
        password: string;
      }>("/api/phone/sip");

      if (data.success) {
        setSipCredentials({
          sipUri: data.sipUri,
          username: data.username,
          password: data.password,
        });
        setSipStatus("created");
      } else {
        setSipStatus("error");
        setSipError("Failed to create SIP endpoint.");
      }
    } catch {
      setSipStatus("error");
      setSipError("Failed to create SIP endpoint. Please try again.");
    } finally {
      setCreatingSip(false);
    }
  };

  // ---- Navigation ----

  const handleContinue = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);
    const success = await saveStep("phone");
    if (success) {
      goToNextStep();
      router.push("/setup/hours");
    }
    setIsSubmitting(false);
  };

  const handleBack = () => {
    goToPreviousStep();
    router.push("/setup/assistant");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ---- Render: New Number ----

  const renderNewNumberFlow = () => (
    <div className="space-y-6">
      {/* Area code selection */}
      <div className="space-y-3">
        <Label htmlFor="area-code">Area code</Label>
        <div className="flex gap-2">
          <select
            id="area-code"
            value={areaCode}
            onChange={(e) =>
              dispatch({
                type: "SET_PHONE_DATA",
                payload: { areaCode: e.target.value },
              })
            }
            className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select area code</option>
            {AREA_CODES.map((ac) => (
              <option key={ac.code} value={ac.code}>
                {ac.code} - {ac.region}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={searchNumbers}
            disabled={!areaCode || searchingNumbers}
          >
            {searchingNumbers ? (
              "Searching..."
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Available numbers */}
      {numberSearchError && (
        <p className="text-sm text-destructive">{numberSearchError}</p>
      )}
      {availableNumbers.length > 0 && (
        <div className="space-y-3">
          <Label>Select a number</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableNumbers.map((phoneNumber) => {
              const isSelected = number === phoneNumber;
              return (
                <button
                  key={phoneNumber}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "SET_PHONE_DATA",
                      payload: { number: phoneNumber },
                    })
                  }
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5",
                    isSelected &&
                      "border-primary bg-primary/5 ring-2 ring-primary/20",
                  )}
                >
                  <span className="font-mono">{phoneNumber}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Provision button */}
      {number && availableNumbers.includes(number) && !numberProvisioned && (
        <div className="space-y-3">
          {provisionError && (
            <p className="text-sm text-destructive">{provisionError}</p>
          )}
          <Button onClick={handleProvisionNumber} disabled={provisioningNumber}>
            {provisioningNumber ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Provisioning...
              </>
            ) : (
              "Provision this number"
            )}
          </Button>
        </div>
      )}

      {/* Success state */}
      {numberProvisioned && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-50 p-3 dark:bg-green-950/20">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            Number {number} is now active and ready to receive calls
          </span>
        </div>
      )}
    </div>
  );

  // ---- Render: Port Number ----

  const renderPortNumberFlow = () => (
    <div className="space-y-6">
      {portSubmitted ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-50 p-3 dark:bg-green-950/20">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Port request submitted
            </span>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p>
              Your number will be transferred in approximately 5-15 business
              days. Your current number stays active during the process.
            </p>
            {portTempNumber && (
              <div className="mt-3">
                <p className="text-muted-foreground">
                  In the meantime, your assistant is available at:
                </p>
                <p className="mt-1 font-mono text-lg font-semibold">
                  {portTempNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Current number */}
          <div className="space-y-2">
            <Label htmlFor="port-number">Current phone number</Label>
            <Input
              id="port-number"
              type="tel"
              placeholder="(555) 123-4567"
              value={portRequest?.phone_number || ""}
              onChange={(e) =>
                dispatch({
                  type: "SET_PHONE_DATA",
                  payload: {
                    portRequest: {
                      ...portRequest,
                      phone_number: e.target.value,
                    },
                  },
                })
              }
            />
          </div>

          {/* Carrier */}
          <div className="space-y-2">
            <Label htmlFor="carrier">Current carrier</Label>
            <select
              id="carrier"
              value={portRequest?.current_carrier || selectedCarrier}
              onChange={(e) => {
                setSelectedCarrier(e.target.value);
                dispatch({
                  type: "SET_PHONE_DATA",
                  payload: {
                    portRequest: {
                      ...portRequest,
                      current_carrier: e.target.value,
                    },
                  },
                });
              }}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Select carrier</option>
              {CARRIERS.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-number">Account number</Label>
              <Input
                id="account-number"
                placeholder="Your carrier account #"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">
                PIN{" "}
                <span className="font-normal text-muted-foreground">
                  (if required)
                </span>
              </Label>
              <Input
                id="pin"
                placeholder="Account PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
          </div>

          {/* Authorized name */}
          <div className="space-y-2">
            <Label htmlFor="authorized-name">Authorized name on account</Label>
            <Input
              id="authorized-name"
              placeholder="Name as it appears on carrier account"
              value={portRequest?.authorized_name || ""}
              onChange={(e) =>
                dispatch({
                  type: "SET_PHONE_DATA",
                  payload: {
                    portRequest: {
                      ...portRequest,
                      authorized_name: e.target.value,
                    },
                  },
                })
              }
            />
          </div>

          {/* Notice */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/20">
            <Clock className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Porting typically takes 5-15 business days
              </p>
              <p className="mt-1 text-amber-700 dark:text-amber-300">
                Your current number will remain active during the porting
                process.
              </p>
            </div>
          </div>

          {/* Temp number option */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 hover:bg-muted/50">
            <input
              type="checkbox"
              checked={useTempNumber}
              onChange={(e) => setUseTempNumber(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <div>
              <p className="font-medium">
                Give me a temporary number while porting
              </p>
              <p className="text-sm text-muted-foreground">
                Start using your assistant immediately with a temporary number
              </p>
            </div>
          </label>

          {/* Submit button */}
          {portError && <p className="text-sm text-destructive">{portError}</p>}
          <Button
            onClick={handleSubmitPort}
            disabled={
              portSubmitting ||
              !portRequest?.phone_number ||
              !portRequest?.current_carrier ||
              !portRequest?.authorized_name
            }
          >
            {portSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit port request"
            )}
          </Button>
        </>
      )}
    </div>
  );

  // ---- Render: Forward ----

  const renderForwardFlow = () => (
    <div className="space-y-6">
      {/* Business number input -- hidden once forwarding is provisioned */}
      {forwardStatus === "idle" || forwardStatus === "error" ? (
        <div className="space-y-2">
          <Label htmlFor="your-number">Your business phone number</Label>
          <Input
            id="your-number"
            type="tel"
            placeholder="(555) 123-4567"
            value={businessNumber}
            onChange={(e) => setBusinessNumber(e.target.value)}
          />
        </div>
      ) : null}

      {/* Provision button -- before provisioning */}
      {forwardStatus === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We&apos;ll assign you a dedicated number that receives your
            forwarded calls. Your AI assistant answers when you&apos;re busy or
            don&apos;t pick up.
          </p>
          {forwardError && (
            <p className="text-sm text-destructive">{forwardError}</p>
          )}
          <Button onClick={handleSetupForward} disabled={!businessNumber}>
            Set up forwarding number
          </Button>
        </div>
      )}

      {/* Provisioning in progress */}
      {forwardStatus === "provisioning" && (
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">
            Provisioning your forwarding number...
          </span>
        </div>
      )}

      {/* Error state */}
      {forwardStatus === "error" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {forwardError || "Failed to set up forwarding. Please try again."}
          </div>
          <Button variant="outline" onClick={handleSetupForward}>
            Retry
          </Button>
        </div>
      )}

      {/* Success: show the forwarding number and instructions */}
      {(forwardStatus === "provisioned" || forwardStatus === "verified") &&
        forwardNumber && (
          <div className="space-y-6">
            {/* Forwarding number display */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                Forward your calls to:
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-mono text-lg font-semibold">
                  {forwardNumber}
                </p>
                <button
                  type="button"
                  onClick={() => copyToClipboard(forwardNumber)}
                  className="rounded p-1 hover:bg-muted"
                  title="Copy number"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Your AI assistant answers calls forwarded to this number when
                you&apos;re busy or don&apos;t pick up
              </p>
            </div>

            {/* Carrier selection and instructions */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="forward-carrier" className="text-xs">
                  Select your carrier for setup instructions
                </Label>
                <select
                  id="forward-carrier"
                  value={forwardCarrier}
                  onChange={(e) => setForwardCarrier(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {CARRIERS.map((carrier) => (
                    <option key={carrier.id} value={carrier.id}>
                      {carrier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Setup instructions:</p>
                <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                  {FORWARDING_INSTRUCTIONS[forwardCarrier]?.steps.map(
                    (step, i) => (
                      <li key={i}>
                        {step.replace("FORWARDING_NUMBER", forwardNumber)}
                      </li>
                    ),
                  )}
                </ol>
                {FORWARDING_INSTRUCTIONS[forwardCarrier]?.note && (
                  <p className="mt-2 text-xs text-muted-foreground/80">
                    {FORWARDING_INSTRUCTIONS[forwardCarrier].note}
                  </p>
                )}
              </div>
            </div>

            {/* Verify button */}
            {forwardStatus === "provisioned" && (
              <Button variant="outline" onClick={handleVerifyForward}>
                <CheckCircle className="mr-2 h-4 w-4" />
                I&apos;ve set up forwarding
              </Button>
            )}

            {forwardStatus === "verified" && (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-50 p-3 dark:bg-green-950/20">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Forwarding verified
                </span>
              </div>
            )}
          </div>
        )}
    </div>
  );

  // ---- Render: SIP ----

  const renderSipFlow = () => (
    <div className="space-y-6">
      {sipStatus === "idle" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              SIP trunking lets your existing phone system (PBX/VOIP) route
              calls directly to your AI assistant. Ideal for multi-line
              businesses like medical offices, hotels, and restaurants.
            </p>
          </div>
          {sipError && <p className="text-sm text-destructive">{sipError}</p>}
          <Button onClick={handleCreateSip} disabled={creatingSip}>
            {creatingSip ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating endpoint...
              </>
            ) : (
              "Create SIP Endpoint"
            )}
          </Button>
        </div>
      )}

      {sipStatus === "creating" && (
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Provisioning SIP endpoint...</span>
        </div>
      )}

      {sipStatus === "created" && sipCredentials && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-50 p-3 dark:bg-green-950/20">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              SIP endpoint created
            </span>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">
              Configure these in your PBX / VOIP system:
            </p>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">SIP URI</Label>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm">{sipCredentials.sipUri}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sipCredentials.sipUri)}
                    className="rounded p-1 hover:bg-muted"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Username
                </Label>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm">{sipCredentials.username}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sipCredentials.username)}
                    className="rounded p-1 hover:bg-muted"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Password
                </Label>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm">{sipCredentials.password}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sipCredentials.password)}
                    className="rounded p-1 hover:bg-muted"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              After configuring your PBX, route incoming calls to the SIP URI
              above. Your AI assistant will answer calls routed through this
              trunk.
            </p>
          </div>
        </div>
      )}

      {sipStatus === "error" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {sipError || "Failed to create SIP endpoint. Please try again."}
          </div>
          <Button variant="outline" onClick={handleCreateSip}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          How will customers reach your assistant?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose how callers will connect to your AI assistant
        </p>
      </div>

      {/* Setup type selection */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PHONE_OPTIONS.map((option) => (
          <SelectionCard
            key={option.type}
            selected={setupType === option.type}
            onClick={() => handleSetupTypeSelect(option.type)}
            icon={option.icon}
            title={option.title}
            description={option.description}
            badge={option.timeline}
          />
        ))}
      </div>

      {/* Setup-specific flows */}
      <div>
        {setupType === "new" && renderNewNumberFlow()}
        {setupType === "port" && renderPortNumberFlow()}
        {setupType === "forward" && renderForwardFlow()}
        {setupType === "sip" && renderSipFlow()}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!canContinue || isSubmitting}
          size="lg"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
