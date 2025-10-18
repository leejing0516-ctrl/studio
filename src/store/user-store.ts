import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type User = {
  id: string;
  name: string;
  type: 'student' | 'teacher';
};

interface UserState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

// We need to make sure the store is created only on the client side
// to avoid hydration errors, as sessionStorage is a client-side API.
const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'user-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // use sessionStorage
    }
  )
);

// A custom hook that returns the user from the store, but only after hydration.
export const useHydratedUserStore = () => {
    const state = useUserStore();
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setHydrated(true);
    }, []);

    return hydrated ? state : { user: null, login: state.login, logout: state.logout };
}
// We will now directly use the `useUserStore` and combine it with a `useHydration` hook in components
// This is a cleaner approach than creating a custom wrapper hook.
export { useUserStore };
