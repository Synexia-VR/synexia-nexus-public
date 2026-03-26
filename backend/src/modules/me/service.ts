import prisma from "../../db/client";
import { OrganizationRole } from "@prisma/client";

export interface MyOrganizationMembershipDTO {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string | null;
  role: OrganizationRole;
}

export async function listMyOrganizations(
  userId: string
): Promise<MyOrganizationMembershipDTO[]> {
  const memberships = await prisma.userOrganizationMembership.findMany({
    where: { userId },
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return memberships.map((m) => ({
    membershipId: m.id,
    organizationId: m.organizationId,
    organizationName: m.organization.name,
    organizationSlug: m.organization.slug ?? null,
    role: m.role,
  }));
}
