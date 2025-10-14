import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface SignInParams {
  email: string;
  password: string;
}

interface SignUpParams extends SignInParams {
  displayName?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Tables<"profiles"> | null;
  loading: boolean;
  signIn: (params: SignInParams) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadProfile(currentUser.id);
      }

      setLoading(false);
    };

    void initialize();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        await loadProfile(nextUser.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      return;
    }

    if (!data) {
      await createProfile(userId);
      return;
    }

    setProfile(data);
  };

  const createProfile = async (userId: string, displayName?: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          display_name: displayName,
          role: "user",
        },
        { onConflict: "user_id" }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.error("Failed to create profile", error);
      return;
    }

    if (data) {
      setProfile(data);
    }
  };

  const signIn = async ({ email, password }: SignInParams) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await createProfile(data.user.id);
    }
  };

  const signUp = async ({ email, password, displayName }: SignUpParams) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await createProfile(data.user.id, displayName);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setProfile(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
