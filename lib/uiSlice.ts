import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ProjectId } from './projects';

/**
 * The selector now holds a real Project id from the API. The mock metric decks
 * are still keyed by the old literal names, so both shapes have to be storable
 * until those decks are backed by endpoints of their own.
 */
export type SelectedProject = ProjectId | (string & {});

const uiSlice = createSlice({ name: 'ui', initialState: { mobileNavOpen: false, activeUseCase: 0, selectedProject: 'PixlTrace' as SelectedProject }, reducers: { setMobileNavOpen: (state, action: PayloadAction<boolean>) => { state.mobileNavOpen = action.payload; }, setActiveUseCase: (state, action: PayloadAction<number>) => { state.activeUseCase = action.payload; }, setSelectedProject: (state, action: PayloadAction<SelectedProject>) => { state.selectedProject = action.payload; } } });
export const { setMobileNavOpen, setActiveUseCase, setSelectedProject } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
