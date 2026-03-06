import { create } from 'zustand';

interface BookingSelection {
  serviceIds: number[];
  masterId: number | null;
  slot: any | null;
}

interface BookingData {
  services: any[];
  masters: any[];
  categories: any[];
}

interface BookingState {
  stepOrder: string[];
  currentStepIndex: number;
  selection: BookingSelection;
  data: BookingData;
  
  // Actions
  setSteps: (steps: string[]) => void;
  setStepIndex: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  setData: (data: Partial<BookingData>) => void;
  
  selectService: (serviceId: number) => void;
  selectMaster: (masterId: number | null) => void;
  selectSlot: (slot: any) => void;
  
  resetSubsequentSteps: (stepName: string) => void;
  resetAll: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  stepOrder: ['services', 'specialist', 'datetime'],
  currentStepIndex: 0,
  selection: {
    serviceIds: [],
    masterId: null,
    slot: null,
  },
  data: {
    services: [],
    masters: [],
    categories: [],
  },

  setSteps: (steps) => set({ stepOrder: steps }),
  
  setStepIndex: (index) => set({ currentStepIndex: index }),
  
  nextStep: () => set((state) => ({ 
    currentStepIndex: Math.min(state.currentStepIndex + 1, state.stepOrder.length) 
  })),
  
  prevStep: () => set((state) => ({ 
    currentStepIndex: Math.max(state.currentStepIndex - 1, 0) 
  })),

  setData: (newData) => set((state) => ({
    data: { ...state.data, ...newData }
  })),

  selectService: (serviceId) => {
    const { selection, stepOrder, resetSubsequentSteps } = get();
    const isSelected = selection.serviceIds.includes(serviceId);
    const newServiceIds = isSelected 
      ? selection.serviceIds.filter(id => id !== serviceId)
      : [...selection.serviceIds, serviceId];
    
    set((state) => ({
      selection: { ...state.selection, serviceIds: newServiceIds }
    }));
    
    resetSubsequentSteps('services');
  },

  selectMaster: (masterId) => {
    const { resetSubsequentSteps } = get();
    set((state) => ({
      selection: { ...state.selection, masterId }
    }));
    resetSubsequentSteps('specialist');
  },

  selectSlot: (slot) => {
    const { resetSubsequentSteps } = get();
    set((state) => ({
      selection: { ...state.selection, slot }
    }));
    // No subsequent steps for slot usually, but let's be safe
    resetSubsequentSteps('datetime');
  },

  resetSubsequentSteps: (stepName) => {
    const { stepOrder, selection } = get();
    const stepIndex = stepOrder.indexOf(stepName);
    if (stepIndex === -1) return;

    const newSelection = { ...selection };
    
    // Check what comes after this step in the order
    for (let i = stepIndex + 1; i < stepOrder.length; i++) {
        const nextStep = stepOrder[i];
        if (nextStep === 'services') newSelection.serviceIds = [];
        if (nextStep === 'specialist') newSelection.masterId = null;
        if (nextStep === 'datetime') newSelection.slot = null;
    }

    set({ selection: newSelection });
  },

  resetAll: () => set({
    currentStepIndex: 0,
    selection: {
      serviceIds: [],
      masterId: null,
      slot: null,
    }
  })
}));
