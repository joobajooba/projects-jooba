/**
 * Re-export useUser from shared UserContext so all consumers
 * (Profile2, EditProfilePanel, ProfileDropdown) see the same user state.
 * When one component calls refetch(), every component using useUser() gets updated data.
 */
export { useUser } from '../context/UserContext';
