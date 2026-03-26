import prisma from "../../db/client";
import { Organization, OrganizationRole, User } from "@prisma/client";

export interface OrganizationContext {
  organization: Organization;
  user: User;
  orgRole: OrganizationRole;
}

// ============================================================================
// ORGANIZATION QUERIES
// ============================================================================

export async function getOrganizationById(
  id: string
): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { id } });
}

export async function getOrganizationBySlug(
  slug: string
): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function getOrganizationsForUser(
  userId: string
): Promise<Organization[]> {
  const memberships = await prisma.userOrganizationMembership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => m.organization);
}

export async function getOrganizationUser(organizationId: string, userId: string) {
  // findFirst para no depender de nombres de índices compuestos
  return prisma.userOrganizationMembership.findFirst({
    where: { organizationId, userId },
  });
}

// ============================================================================
// ORGANIZATION CREATE
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 5);
}

export async function createOrganizationForUser(
  userId: string,
  input: {
    name: string;
    slug?: string;
    timezone?: string;
    planTier?: string;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  }
): Promise<Organization> {
  return prisma.$transaction(async (tx) => {
    let slug = input.slug || generateSlug(input.name);
    const timezone = input.timezone || "Europe/Madrid";
    const planTier = input.planTier || "team";

    const orgData = {
      name: input.name,
      slug,
      timezone,
      planTier,
      primaryColor: input.primaryColor ?? null,
      secondaryColor: input.secondaryColor ?? null,
    };

    let org: Organization;
    try {
      org = await tx.organization.create({ data: orgData });
    } catch (error: any) {
      if (error.code === "P2002" && error.meta?.target?.includes("slug")) {
        slug = `${slug}-${randomSuffix()}`;
        org = await tx.organization.create({
          data: { ...orgData, slug },
        });
      } else {
        throw error;
      }
    }

    await tx.userOrganizationMembership.create({
      data: {
        organizationId: org.id,
        userId,
        role: "OWNER",
      },
    });

    return org;
  });
}

// ============================================================================
// MODULES
// ============================================================================

export async function getOrganizationModules(organizationId: string) {
  return prisma.organizationModule.findMany({
    where: { organizationId },
    include: { module: true },
  });
}

export async function getAllModules() {
  return prisma.module.findMany();
}
