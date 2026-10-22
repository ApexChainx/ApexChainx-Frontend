import { expectTypeOf, it } from "vitest";
import type { ComponentProps, ReactElement } from "react";
import type Sidebar from "@/components/layout/Sidebar";
import type { SidebarProps } from "@/components/layout/Sidebar";
import type { SidebarGroupProps } from "@/components/layout/SidebarLinkGroup";
import type {
  SidebarGroup,
  SidebarGroupId,
  SidebarLink,
  flattenSidebarLinks,
  groupSidebarLinks,
} from "@/components/layout/sidebar-items";

it("exposes strict sidebar data and callback contracts", () => {
  expectTypeOf<ComponentProps<typeof Sidebar>>().toEqualTypeOf<SidebarProps | undefined>();
  expectTypeOf<ReturnType<typeof Sidebar>>().toEqualTypeOf<ReactElement>();
  expectTypeOf<SidebarProps["links"]>().toEqualTypeOf<readonly SidebarLink[] | undefined>();
  expectTypeOf<ReturnType<typeof groupSidebarLinks>>().toEqualTypeOf<readonly SidebarGroup[]>();
  expectTypeOf<ReturnType<typeof flattenSidebarLinks>>().toEqualTypeOf<readonly SidebarLink[]>();
  expectTypeOf<SidebarGroupProps["onToggle"]>().toEqualTypeOf<(id: SidebarGroupId) => void>();
  expectTypeOf<SidebarGroupProps["pathname"]>().toEqualTypeOf<string | null | undefined>();
});

// Checked by `npm run typecheck`; never invoked with invalid data at runtime.
function rejectedContracts(props: SidebarProps, link: SidebarLink, group: SidebarGroup) {
  // @ts-expect-error Drawer state must be boolean.
  const invalidOpen: SidebarProps = { defaultOpen: "open" };
  // @ts-expect-error Each destination needs a translation key.
  const invalidLink: SidebarLink = { href: "/custom" };
  // @ts-expect-error Group identifiers are a closed union.
  const invalidGroup: SidebarGroupId = "unknown";
  // @ts-expect-error The caller's catalogue cannot be replaced.
  props.links = [];
  // @ts-expect-error Destinations cannot be mutated through sidebar types.
  link.href = "/changed";
  // @ts-expect-error Group links cannot be appended in place.
  group.links.push(link);
  // @ts-expect-error Group callbacks receive a group id, not a number.
  const invalidToggle: SidebarGroupProps["onToggle"] = (id: number) => { void id; };
  return [invalidOpen, invalidLink, invalidGroup, invalidToggle];
}
void rejectedContracts;
