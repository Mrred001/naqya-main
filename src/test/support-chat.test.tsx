import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType, PropsWithChildren } from "react";
import { SupportConversation } from "@/components/chat/SupportConversation";
import { Route } from "@/routes/fcds.messages";
import { CommunityRequestButton } from "@/components/fcds/CommunityRequestButton";
import {
  hasUnread,
  orderedMessages,
  type SupportConversation as Conversation,
  type SupportMessage,
} from "@/lib/support-chat";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  user: null as { id: string; is_anonymous?: boolean } | null,
  ready: true,
  rows: [] as unknown[],
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("@/components/account/AccountProvider", () => ({
  useAccount: () => ({ user: mocks.user, ready: mocks.ready }),
}));
vi.mock("@/components/site/PreferencesProvider", () => ({
  useSitePreferences: () => ({ language: "en" }),
}));
vi.mock("@/components/account/GoogleSignIn", () => ({
  GoogleSignIn: ({ intent }: { intent?: string }) => (
    <button data-intent={intent}>Continue with Google</button>
  ),
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...props }: PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  mocks.ready = true;
  mocks.rows = [];
  mocks.rpc.mockResolvedValue({ data: "conversation-a", error: null });
  mocks.from.mockImplementation(() => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      or: () => chain,
      abortSignal: async () => ({ data: mocks.rows, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return chain;
  });
});
function wrap(child: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      {child}
    </QueryClientProvider>,
  );
}
const conversation: Conversation = {
  id: "conversation-a",
  user_id: "student-a",
  display_name: "Student A",
  created_at: "2026-10-25T10:00:00Z",
  last_message_at: "2026-10-25T10:02:00Z",
  latest_user_message_at: "2026-10-25T10:00:00Z",
  latest_admin_message_at: "2026-10-25T10:02:00Z",
  user_read_at: "2026-10-25T10:00:00Z",
  admin_read_at: "2026-10-25T10:00:00Z",
};
const message = (
  id: string,
  body: string,
  role: "user" | "admin",
  time: string,
): SupportMessage => ({
  id,
  body,
  sender_role: role,
  sender_id: role === "user" ? "student-a" : "admin-a",
  conversation_id: conversation.id,
  client_nonce: id,
  created_at: time,
});
describe("private support chat", () => {
  it("requires login before showing a composer or reading messages", () => {
    const Page = Route.options.component as ComponentType;
    wrap(<Page />);
    expect(screen.getByText("Sign in to start your private chat")).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toHaveAttribute(
      "data-intent",
      "support-chat",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("requires a full login for Supabase anonymous-auth sessions", () => {
    mocks.user = { id: "anonymous-account", is_anonymous: true };
    const Page = Route.options.component as ComponentType;
    wrap(<Page />);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("routes the blue message action to the authenticated chat page", () => {
    wrap(<CommunityRequestButton kind="message" iconOnly />);
    expect(screen.getByRole("link", { name: "Message Ahmed" })).toHaveAttribute(
      "href",
      "/fcds/messages",
    );
    expect(screen.getByRole("link", { name: "Message Ahmed" })).toHaveClass("text-blue-600");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  it("keeps a failed draft and reuses its nonce on retry", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: { message: "network error" } })
      .mockResolvedValue({ data: "conversation-a", error: null });
    wrap(<SupportConversation userId="student-a" conversation={null} />);
    fireEvent.change(screen.getByLabelText("Your message"), {
      target: { value: "Need help with matrices" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Your message")).toHaveValue("Need help with matrices");
    const nonce = mocks.rpc.mock.calls[0]?.[1].p_client_nonce;
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(screen.getByLabelText("Your message")).toHaveValue(""));
    expect(mocks.rpc.mock.calls[1]).toEqual([
      "send_support_message",
      { p_body: "Need help with matrices", p_client_nonce: nonce },
    ]);
  });
  it("shows both sides of the conversation and marks only loaded messages read", async () => {
    mocks.rows = [
      message("reply", "Ahmed reply", "admin", "2026-10-25T10:02:00Z"),
      message("first", "Student question", "user", "2026-10-25T10:00:00Z"),
    ];
    wrap(<SupportConversation userId="student-a" conversation={conversation} />);
    await screen.findByText("Ahmed reply");
    expect(screen.getByText("Student question")).toBeVisible();
    expect(screen.getByText("Ahmed", { exact: true })).toBeVisible();
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("mark_support_read", {
        p_conversation: "conversation-a",
        p_through: "2026-10-25T10:02:00Z",
      }),
    );
  });
  it("derives separate unread state for the participant and admin", () => {
    expect(hasUnread(conversation, "user")).toBe(true);
    expect(hasUnread(conversation, "admin")).toBe(false);
    expect(
      hasUnread({ ...conversation, user_read_at: conversation.latest_admin_message_at }, "user"),
    ).toBe(false);
    expect(hasUnread({ ...conversation, admin_read_at: null }, "admin")).toBe(true);
  });
  it("keeps sub-millisecond replies unread until their exact timestamp is seen", () => {
    expect(
      hasUnread(
        {
          ...conversation,
          user_read_at: "2026-10-25T10:02:00.123100Z",
          latest_admin_message_at: "2026-10-25T10:02:00.123900Z",
        },
        "user",
      ),
    ).toBe(true);
  });
  it("deduplicates overlapping history pages and retains chronological order", () => {
    const first = message("first", "Question", "user", "2026-10-25T10:00:00Z"),
      reply = message("reply", "Answer", "admin", "2026-10-25T10:02:00Z");
    expect(orderedMessages([[reply, first], [first]]).map((m) => m.id)).toEqual(["first", "reply"]);
  });
});
