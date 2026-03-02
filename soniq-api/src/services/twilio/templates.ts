type MessageType = "confirmation" | "reminder" | "missed_call" | "custom";

const TEMPLATES: Record<MessageType, string> = {
  confirmation: `Hi {customerName}! Your appointment is confirmed for {date} at {time}. Your confirmation code is {confirmationCode}. Reply CANCEL to cancel.`,

  reminder: `Reminder: You have an appointment tomorrow, {date} at {time}. Confirmation: {confirmationCode}. See you then!`,

  missed_call: `Sorry we missed you! We'll call you back soon, or call us at your convenience.`,

  custom: `{message}`,
};

/**
 * Get SMS template with context values replaced
 */
export function getTemplate(
  type: MessageType,
  context: Record<string, string>,
): string {
  let template = TEMPLATES[type];

  // Replace all placeholders
  for (const [key, value] of Object.entries(context)) {
    template = template.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }

  return template;
}
