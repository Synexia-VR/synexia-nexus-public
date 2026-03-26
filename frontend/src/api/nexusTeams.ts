import { apiRequest, setAuthToken } from "./client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  planTier: string;
  primaryColor: string | null;
  secondaryColor: string | null;
}

export interface Player {
  id: string;
  organizationId: string;
  nickname: string;
  mainRole: string | null;
  status: string;
}

export interface PlayerMmr {
  id: string;
  playerId: string;
  calculatedAt: string;
  periodStart: string;
  periodEnd: string;
  mmrValue: number;
  performanceScore: number;
  commitmentScore: number;
  behaviorScore: number;
}

export interface Game {
  id: string;
  code: string;
  name: string;
  displayName: string | null;
}

export interface Team {
  id: string;
  organizationId: string;
  gameId: string;
  name: string;
  tag: string | null;
  category: string | null;
  accentColor: string | null;
}

export interface Match {
  id: string;
  organizationId: string;
  teamId: string;
  eventId?: string | null;
  opponentName: string;
  competitionName: string | null;
  result: string;
  mapName: string | null;
  playedAtUtc: string;
  team?: { id: string; name: string; tag: string | null };
}

export interface ShooterMatchStat {
  id: string;
  matchId: string;
  playerId: string;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  roundsPlayed: number | null;
  player?: Player;
}

export type EventType = "training" | "scrim" | "match" | "vod_review" | string;

export interface Event {
  id: string;
  organizationId: string;
  teamId: string;
  type: EventType;
  title: string;
  description: string | null;
  startDatetimeUtc: string;
  endDatetimeUtc: string | null;
  location: string | null;
  createdByUserId?: string | null;
  team?: { id: string; name: string; tag: string | null };
}

export async function fetchGames(): Promise<Game[]> {
  return apiRequest<Game[]>("/games");
}

export async function fetchOrganizations(): Promise<Organization[]> {
  return apiRequest<Organization[]>("/organizations");
}

export async function fetchPlayersByOrganization(
  organizationId: string
): Promise<Player[]> {
  return apiRequest<Player[]>(`/organizations/${organizationId}/players`);
}

export async function fetchPlayerLatestMmr(
  playerId: string
): Promise<PlayerMmr | null> {
  try {
    return await apiRequest<PlayerMmr>(`/players/${playerId}/mmr`);
  } catch (err: any) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function recalculateOrgMmr(
  organizationId: string
): Promise<void> {
  await apiRequest("/mmr/recalculate", {
    method: "POST",
    body: JSON.stringify({ organizationId }),
  });
}

export async function fetchTeamsByOrganization(
  organizationId: string
): Promise<Team[]> {
  return apiRequest<Team[]>(`/organizations/${organizationId}/teams`);
}

export async function createTeam(params: {
  organizationId: string;
  name: string;
  gameId?: string | null;
}): Promise<Team> {
  return apiRequest<Team>("/teams", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export interface RosterEntry {
  id: string;
  teamId: string;
  playerId: string;
  roleInTeam: string | null;
  status: string;
  player?: Player;
}

export async function fetchTeamRoster(teamId: string): Promise<RosterEntry[]> {
  return apiRequest<RosterEntry[]>(`/teams/${teamId}/roster`);
}

export async function addPlayerToRoster(
  teamId: string,
  playerId: string
): Promise<RosterEntry> {
  return apiRequest<RosterEntry>(`/teams/${teamId}/roster`, {
    method: "POST",
    body: JSON.stringify({ playerId }),
  });
}

export async function removePlayerFromRoster(
  teamId: string,
  playerId: string
): Promise<void> {
  return apiRequest<void>(`/teams/${teamId}/roster/${playerId}`, {
    method: "DELETE",
  });
}

export async function fetchTeams(options?: { organizationId?: string }): Promise<Team[]> {
  if (options?.organizationId) {
    return apiRequest<Team[]>(`/organizations/${options.organizationId}/teams`);
  }
  return apiRequest<Team[]>("/teams");
}

export async function fetchPlayers(options?: { organizationId?: string }): Promise<Player[]> {
  if (options?.organizationId) {
    return apiRequest<Player[]>(`/organizations/${options.organizationId}/players`);
  }
  return apiRequest<Player[]>("/players");
}

export async function fetchMatches(params: {
  organizationId?: string;
  teamId?: string;
}): Promise<Match[]> {
  const search = new URLSearchParams();
  if (params.organizationId) search.set("organizationId", params.organizationId);
  if (params.teamId) search.set("teamId", params.teamId);
  const query = search.toString();
  const path = query ? `/matches?${query}` : "/matches";
  return apiRequest<Match[]>(path);
}

export async function fetchMatchStats(
  matchId: string
): Promise<ShooterMatchStat[]> {
  return apiRequest<ShooterMatchStat[]>(`/matches/${matchId}/stats`);
}

export async function upsertMatchStats(
  matchId: string,
  stats: Array<{
    playerId: string;
    kills: number;
    deaths: number;
    assists: number;
    adr: number;
    roundsPlayed?: number;
  }>
): Promise<ShooterMatchStat[]> {
  return apiRequest<ShooterMatchStat[]>(`/matches/${matchId}/stats`, {
    method: "POST",
    body: JSON.stringify({ stats }),
  });
}

export async function fetchEvents(params: {
  organizationId?: string;
  teamId?: string;
  type?: string;
}): Promise<Event[]> {
  const search = new URLSearchParams();
  if (params.organizationId) search.set("organizationId", params.organizationId);
  if (params.teamId) search.set("teamId", params.teamId);
  if (params.type) search.set("type", params.type);
  const query = search.toString();
  const path = query ? `/events?${query}` : "/events";
  return apiRequest<Event[]>(path);
}

export async function createEvent(input: {
  organizationId: string;
  teamId: string;
  type: EventType;
  title: string;
  description?: string;
  startDatetimeUtc: string;
  endDatetimeUtc?: string;
  location?: string;
  createdByUserId?: string | null;
}): Promise<Event> {
  return apiRequest<Event>("/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createMatch(input: {
  organizationId: string;
  teamId: string;
  eventId?: string;
  opponentName: string;
  competitionName?: string;
  result: string;
  mapName?: string;
  playedAtUtc: string;
}): Promise<Match> {
  return apiRequest<Match>("/matches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(res.accessToken);
  return res;
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(res.accessToken);
  return res;
}

export type OrganizationRole =
  | "OWNER"
  | "MANAGER"
  | "COACH"
  | "ANALYST"
  | "PLAYER"
  | "COMMUNITY_MANAGER"
  | "PARTNER_MANAGER"
  | "VIEWER";

export interface MyOrganizationMembership {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string | null;
  role: OrganizationRole;
}

export interface MyOrganizationsResponse {
  organizations: MyOrganizationMembership[];
}

export async function fetchMyOrganizations(): Promise<MyOrganizationMembership[]> {
  const res = await apiRequest<MyOrganizationsResponse>("/me/organizations");
  return res.organizations;
}

export interface OrganizationMember {
  membershipId: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: OrganizationRole;
  createdAt: string;
}

export interface OrganizationMembersResponse {
  members: OrganizationMember[];
}

export async function fetchOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  const res = await apiRequest<OrganizationMembersResponse>(
    `/organizations/${organizationId}/members`
  );
  return res.members;
}

export async function addOrganizationMember(
  organizationId: string,
  userEmail: string,
  role: OrganizationRole
): Promise<OrganizationMember> {
  const res = await apiRequest<{ member: OrganizationMember }>(
    `/organizations/${organizationId}/members`,
    {
      method: "POST",
      body: JSON.stringify({ userEmail, role }),
    }
  );
  return res.member;
}

export async function updateOrganizationMemberRole(
  organizationId: string,
  membershipId: string,
  role: OrganizationRole
): Promise<OrganizationMember> {
  const res = await apiRequest<{ member: OrganizationMember }>(
    `/organizations/${organizationId}/members/${membershipId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }
  );
  return res.member;
}

export async function removeOrganizationMember(
  organizationId: string,
  membershipId: string
): Promise<void> {
  await apiRequest<void>(
    `/organizations/${organizationId}/members/${membershipId}`,
    {
      method: "DELETE",
    }
  );
}

export const updateOrganizationMemberRoleApi = updateOrganizationMemberRole;
export const removeOrganizationMemberApi = removeOrganizationMember;

export type TeamMemberRole = 'PLAYER' | 'COACH' | 'ANALYST' | 'STAFF';

export interface TeamMemberRoleEntry {
  id: string;
  teamId: string;
  organizationId: string;
  userId: string;
  role: TeamMemberRole;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
  team: {
    id: string;
    name: string;
  };
}

export async function fetchTeamMemberships(organizationId: string): Promise<TeamMemberRoleEntry[]> {
  return apiRequest<TeamMemberRoleEntry[]>(`/organizations/${organizationId}/team-memberships`);
}

export interface CreateTeamMembershipInput {
  organizationId: string;
  teamId: string;
  targetUserId: string;
  role: TeamMemberRole;
}

export async function createTeamMembershipApi(input: CreateTeamMembershipInput): Promise<TeamMemberRoleEntry> {
  const { organizationId, ...body } = input;
  return apiRequest<TeamMemberRoleEntry>(`/organizations/${organizationId}/team-memberships`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteTeamMembershipApi(organizationId: string, membershipId: string): Promise<void> {
  await apiRequest<void>(`/organizations/${organizationId}/team-memberships/${membershipId}`, {
    method: 'DELETE',
  });
}

export interface ShooterPlayerAggregateStats {
  playerId: string;
  nickname: string;
  mainRole: string | null;

  mapsPlayed: number;
  matchesPlayed: number;
  roundsPlayed: number;
  kills: number;
  deaths: number;
  assists: number;

  adr: number;
  kd: number;
  kad: number;
  kaPerRound: number;

  roleScore: number;
  score: number;
  roleScoreAdr: number;
  roleScoreKad: number;
  roleScoreKd: number;
}

export interface ShooterMapAggregateStats {
  mapName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  mapWinRate: number;
  teamAdr: number;
}

export async function fetchShooterPlayerStats(params: {
  organizationId: string;
  teamId?: string;
}): Promise<ShooterPlayerAggregateStats[]> {
  const search = new URLSearchParams();
  search.set("organizationId", params.organizationId);
  if (params.teamId) search.set("teamId", params.teamId);
  return apiRequest<ShooterPlayerAggregateStats[]>(`/stats/shooter/players?${search.toString()}`);
}

export async function fetchShooterMapStats(params: {
  organizationId: string;
  teamId?: string;
}): Promise<ShooterMapAggregateStats[]> {
  const search = new URLSearchParams();
  search.set("organizationId", params.organizationId);
  if (params.teamId) search.set("teamId", params.teamId);
  return apiRequest<ShooterMapAggregateStats[]>(`/stats/shooter/maps?${search.toString()}`);
}

export interface ShooterTeamSummary {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  teamNpr: number;
  teamAdr: number | null;
  teamKd: number | null;
  teamKad: number | null;
}

export interface ShooterTeamMatchSummary {
  matchId: string;
  playedAtUtc: string | null;
  opponentName: string | null;
  mapName: string | null;
  roundsWon: number | null;
  roundsLost: number | null;
  result: 'pending' | 'win' | 'loss' | 'draw';
  teamNpr: number | null;
  teamAdr: number | null;
  teamKd: number | null;
  teamKad: number | null;
}

export interface ShooterTeamOverview {
  summary: ShooterTeamSummary;
  matches: ShooterTeamMatchSummary[];
}

export async function fetchShooterTeamOverview(params: {
  organizationId: string;
  teamId: string;
  from?: string;
  to?: string;
}): Promise<ShooterTeamOverview> {
  const query = new URLSearchParams();
  query.set("organizationId", params.organizationId);
  query.set("teamId", params.teamId);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  return apiRequest<ShooterTeamOverview>(`/stats/shooter/team?${query.toString()}`);
}
