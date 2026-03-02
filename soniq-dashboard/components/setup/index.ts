// Multi-step setup wizard
export {
  SetupProvider,
  useSetup,
  SETUP_STEPS,
  STEP_LABELS,
  canAccessStep,
  isValidStep,
} from "./SetupContext";
export { SetupProgressBar } from "./SetupProgressBar";

// Step components
export {
  BusinessStep,
  CapabilitiesStep,
  DetailsStep,
  IntegrationsStep,
  AssistantStep,
  PhoneStep,
  HoursStep,
  EscalationStep,
  ReviewStep,
} from "./steps";
