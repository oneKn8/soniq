import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import {
  EmptyState,
  EmptyContactsState,
  EmptyDashboardState,
} from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Nothing here"
        description="Come back later."
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Nothing here" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Come back later.")).toBeInTheDocument();
  });

  it("omits the description paragraph when none is provided", () => {
    render(<EmptyState icon={Inbox} title="Empty" />);

    expect(screen.getByRole("heading", { name: "Empty" })).toBeInTheDocument();
    expect(screen.queryByText("Come back later.")).not.toBeInTheDocument();
  });

  it("renders a primary action and fires its onClick handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        action={{ label: "Do the thing", onClick }}
      />,
    );

    const button = screen.getByRole("button", { name: "Do the thing" });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders both primary and secondary actions and only triggers the one clicked", async () => {
    const user = userEvent.setup();
    const primary = vi.fn();
    const secondary = vi.fn();

    render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        action={{ label: "Primary", onClick: primary }}
        secondaryAction={{ label: "Secondary", onClick: secondary }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Secondary" }));
    expect(secondary).toHaveBeenCalledTimes(1);
    expect(primary).not.toHaveBeenCalled();
  });

  it("does not render any action button when no action is supplied", () => {
    render(<EmptyState icon={Inbox} title="Empty" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the compact variant without an action", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Compact empty"
        description="Small footprint."
        variant="compact"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Compact empty" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("pre-built empty states", () => {
  it("EmptyContactsState uses the universal customer plural label", () => {
    render(<EmptyContactsState />);
    // Universal terminology pluralises Customer -> "customers".
    expect(
      screen.getByRole("heading", { name: /no customers yet/i }),
    ).toBeInTheDocument();
  });

  it("EmptyContactsState only shows the add action when a handler is given", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    const { rerender } = render(<EmptyContactsState />);
    expect(
      screen.queryByRole("button", { name: /add contact/i }),
    ).not.toBeInTheDocument();

    rerender(<EmptyContactsState onAdd={onAdd} />);
    await user.click(screen.getByRole("button", { name: /add contact/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("EmptyDashboardState welcomes the user to Soniq with setup actions", () => {
    render(<EmptyDashboardState />);
    expect(
      screen.getByRole("heading", { name: /welcome to soniq/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /complete setup/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view settings/i }),
    ).toBeInTheDocument();
  });
});
