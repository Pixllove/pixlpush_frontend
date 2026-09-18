import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ProjectId } from './projects';

const uiSlice = createSlice({ name: 'ui', initialState: { mobileNavOpen: false, activeUseCase: 0, selectedProject: 'PixlTrace' as ProjectId }, reducers: { setMobileNavOpen: (state, action: PayloadAction<boolean>) => { state.mobileNavOpen = action.payload; }, setActiveUseCase: (state, action: PayloadAction<number>) => { state.activeUseCase = action.payload; }, setSelectedProject: (state, action: PayloadAction<ProjectId>) => { state.selectedProject = action.payload; } } });
export const { setMobileNavOpen, setActiveUseCase, setSelectedProject } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
