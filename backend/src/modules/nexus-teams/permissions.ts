import prisma from '../../db/client';
import type { OrganizationRole } from '@prisma/client';

const ORG_ROLES_CAN_MANAGE_EVENTS: OrganizationRole[] = [
  "OWNER",
  "MANAGER",
  "COACH",
  "ANALYST",
];

const ORG_ROLES_CAN_MANAGE_MATCHES: OrganizationRole[] = [
  "OWNER",
  "MANAGER",
  "COACH",
  "ANALYST",
];

const ORG_ROLES_CAN_EDIT_STATS: OrganizationRole[] = [
  "OWNER",
  "MANAGER",
  "COACH",
  "ANALYST",
];

const ORG_ROLES_CAN_MANAGE_MEMBERS: OrganizationRole[] = [
  "OWNER",
  "MANAGER",
];

const ORG_ROLES_CAN_MANAGE_TEAMS: OrganizationRole[] = [
  "OWNER",
  "MANAGER",
];

const ORG_ROLES_ANY: OrganizationRole[] = [
  "OWNER",
  "MANAGER",
  "COACH",
  "ANALYST",
  "PLAYER",
  "COMMUNITY_MANAGER",
  "PARTNER_MANAGER",
  "VIEWER",
];

async function userHasOrgRole(
  userId: string,
  organizationId: string,
  allowedRoles: OrganizationRole[]
): Promise<boolean> {
  if (!userId || !organizationId) {
    return false;
  }

  const membership = await prisma.userOrganizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      role: {
        in: allowedRoles,
      },
    },
  });

  return Boolean(membership);
}

export async function canUserManageEvents(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return userHasOrgRole(userId, organizationId, ORG_ROLES_CAN_MANAGE_EVENTS);
}

export async function canUserManageMatches(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return userHasOrgRole(userId, organizationId, ORG_ROLES_CAN_MANAGE_MATCHES);
}

export async function canUserEditStats(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return userHasOrgRole(userId, organizationId, ORG_ROLES_CAN_EDIT_STATS);
}

export async function canUserManageOrgMembers(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return userHasOrgRole(userId, organizationId, ORG_ROLES_CAN_MANAGE_MEMBERS);
}

export async function canUserManageTeams(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return userHasOrgRole(userId, organizationId, ORG_ROLES_CAN_MANAGE_TEAMS);
}

export async function isUserMemberOfOrg(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return userHasOrgRole(userId, organizationId, ORG_ROLES_ANY);
}

export async function canUserRecalculateMmr(
  userId: string,
  organizationId: string
 ): Promise<boolean> {
  const membership = await prisma.userOrganizationMembership.findFirst({
    where: { userId, organizationId },
  });

  if (!membership) return false;

  const allowedRoles: OrganizationRole[] = [
    'OWNER',
    'MANAGER',
    'COACH',
    'ANALYST',
  ];

  return allowedRoles.includes(membership.role);
}

export async function canUserManageTeamMemberships(
  userId: string,
  organizationId: string
): Promise<boolean> {
  return userHasOrgRole(userId, organizationId, ORG_ROLES_CAN_MANAGE_MEMBERS);
}
