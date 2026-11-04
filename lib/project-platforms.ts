import type { ProjectPlatform } from '@/types/project';

/** Toggle a Project's push platform without allowing an empty selection. */
export function toggleProjectPlatform(platforms: ProjectPlatform[], platform: ProjectPlatform): ProjectPlatform[] {
  if (platforms.includes(platform)) {
    return platforms.length > 1 ? platforms.filter((item) => item !== platform) : platforms;
  }
  return [...platforms, platform];
}
