export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)

    public: {
        Tables: {
            absence_records: {
                Row: {
                    created_at: string | null
                    custom_reason: string | null
                    date_range: Json | null
                    dates: string[]
                    departure_time: string | null
                    expires_at: string
                    id: number
                    proof_document: string | null
                    reason: string
                    return_time: string | null
                    status: string
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    custom_reason?: string | null
                    date_range?: Json | null
                    dates: string[]
                    departure_time?: string | null
                    expires_at: string
                    id?: number
                    proof_document?: string | null
                    reason: string
                    return_time?: string | null
                    status: string
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    custom_reason?: string | null
                    date_range?: Json | null
                    dates?: string[]
                    departure_time?: string | null
                    expires_at?: string
                    id?: number
                    proof_document?: string | null
                    reason?: string
                    return_time?: string | null
                    status?: string
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "absence_records_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            admin_settings: {
                Row: {
                    id: string
                    key: string
                    updated_at: string | null
                    value: Json | null
                }
                Insert: {
                    id?: string
                    key: string
                    updated_at?: string | null
                    value?: Json | null
                }
                Update: {
                    id?: string
                    key?: string
                    updated_at?: string | null
                    value?: Json | null
                }
                Relationships: []
            }
            holidays: {
                Row: {
                    created_at: string | null
                    date: string
                    description: string | null
                    id: number
                    name: string
                    type: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    date: string
                    description?: string | null
                    id?: number
                    name: string
                    type: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    date?: string
                    description?: string | null
                    id?: number
                    name?: string
                    type?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            hour_bank_compensations: {
                Row: {
                    created_at: string
                    date: string
                    description: string | null
                    hours: number
                    id: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    date: string
                    description?: string | null
                    hours: number
                    id?: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    date?: string
                    description?: string | null
                    hours?: number
                    id?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "hour_bank_compensations_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            overtime_records: {
                Row: {
                    approved_by: string | null
                    created_at: string | null
                    date: string
                    end_time: string
                    id: number
                    reason: string | null
                    start_time: string
                    status: string
                    user_id: string
                }
                Insert: {
                    approved_by?: string | null
                    created_at?: string | null
                    date: string
                    end_time: string
                    id?: number
                    reason?: string | null
                    start_time: string
                    status?: string
                    user_id: string
                }
                Update: {
                    approved_by?: string | null
                    created_at?: string | null
                    date?: string
                    end_time?: string
                    id?: number
                    reason?: string | null
                    start_time?: string
                    status?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "overtime_records_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            projects: {
                Row: {
                    created_at: string
                    id: string
                    name: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    name: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    name?: string
                }
                Relationships: []
            }
            time_clock_records: {
                Row: {
                    created_at: string | null
                    date: string
                    id: number
                    time: string
                    type: string
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    date: string
                    id?: number
                    time: string
                    type: string
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    date?: string
                    id?: number
                    time?: string
                    type?: string
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "time_clock_records_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            time_requests: {
                Row: {
                    actual_time: string | null
                    admin_notes: string | null
                    created_at: string | null
                    holiday_id: number
                    id: number
                    reason: string
                    request_type: string
                    requested_time: string
                    status: string
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    actual_time?: string | null
                    admin_notes?: string | null
                    created_at?: string | null
                    holiday_id: number
                    id?: number
                    reason: string
                    request_type: string
                    requested_time: string
                    status?: string
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    actual_time?: string | null
                    admin_notes?: string | null
                    created_at?: string | null
                    holiday_id?: number
                    id?: number
                    reason?: string
                    request_type?: string
                    requested_time?: string
                    status?: string
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "time_requests_holiday_id_fkey"
                        columns: ["holiday_id"]
                        isOneToOne: false
                        referencedRelation: "holidays"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "time_requests_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            users: {
                Row: {
                    birth_date: string | null
                    cpf: string | null
                    created_at: string | null
                    email: string | null
                    first_name: string | null
                    id: string
                    is_first_access: boolean | null
                    last_name: string | null
                    profile_picture_url: string | null
                    project_id: string | null
                    role: string
                    shift: string | null
                    updated_at: string | null
                    username: string | null
                }
                Insert: {
                    birth_date?: string | null
                    cpf?: string | null
                    created_at?: string | null
                    email?: string | null
                    first_name?: string | null
                    id?: string
                    is_first_access?: boolean | null
                    last_name?: string | null
                    profile_picture_url?: string | null
                    project_id?: string | null
                    role: string
                    shift?: string | null
                    updated_at?: string | null
                    username?: string | null
                }
                Update: {
                    birth_date?: string | null
                    cpf?: string | null
                    created_at?: string | null
                    email?: string | null
                    first_name?: string | null
                    id?: string
                    is_first_access?: boolean | null
                    last_name?: string | null
                    profile_picture_url?: string | null
                    project_id?: string | null
                    role?: string
                    shift?: string | null
                    updated_at?: string | null
                    username?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "users_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
