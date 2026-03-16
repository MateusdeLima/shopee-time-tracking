import { supabase } from "./supabase"
import { createUser, type User } from "./db"
import { initializeDb } from "./db"

// Função para converter nomes de campos do Supabase para o formato camelCase
function convertToCamelCase<T>(data: any): T {
  if (!data) return data

  if (Array.isArray(data)) {
    return data.map((item) => convertToCamelCase(item)) as unknown as T
  }

  if (typeof data === "object" && data !== null) {
    const newObj: any = {}

    Object.keys(data).forEach((key) => {
      // Converter snake_case para camelCase
      const newKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      newObj[newKey] = convertToCamelCase(data[key])
    })

    return newObj as T
  }

  return data as T
}

// Função para autenticar funcionário
export async function authenticateEmployee(
  firstName?: string,
  lastName?: string,
  email?: string,
  username?: string,
  cpf?: string,
  birthDate?: string,
  profilePictureUrl?: string,
  shift?: "8-17" | "9-18",
): Promise<User> {
  try {
    // Inicializar o banco de dados primeiro
    await initializeDb()

    // Verificar se é um login de funcionário (Novo fluxo: Email + Opcional ID)
    if (email) {
      const { data: user, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle()

      if (error) {
        console.error("Erro ao buscar usuário por email:", error)
        throw new Error("Erro ao verificar cadastro. Tente novamente.")
      }

      if (!user) {
        throw new Error("E-mail não cadastrado. Entre em contato com o administrador.")
      }

      // Se o usuário forneceu o ID (username)
      if (username) {
        if (user.username !== username) {
          throw new Error("ID incorreto para este e-mail.")
        }
        return convertToCamelCase<User>(user)
      }

      // Se o usuário forneceu APENAS o e-mail
      if (user.is_first_access) {
        // Primeiro acesso permitido apenas com email
        return convertToCamelCase<User>(user)
      } else {
        // Não é primeiro acesso, ID é obrigatório
        throw new Error("Este e-mail já foi acessado. Por favor, insira seu ID.")
      }
    }

    // Remoção do fluxo antigo de criação de conta/primeiro acesso manual

    throw new Error("Dados de autenticação incompletos")
  } catch (error) {
    console.error("Erro em authenticateEmployee:", error)
    throw error
  }
}

// Função para autenticar administrador
export async function authenticateAdmin(email: string, password: string): Promise<User> {
  // Autenticar via Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    throw new Error("Credenciais inválidas. Tente novamente.")
  }

  // Buscar usuário na tabela users
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle()

  if (userError) {
    throw new Error("Erro ao buscar usuário admin no banco de dados.")
  }

  // Se não existir, criar automaticamente como admin
  let user = userData
  if (!user) {
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert([
        {
          first_name: data.user.user_metadata?.first_name || "Admin",
          last_name: data.user.user_metadata?.last_name || "",
          email: email,
    role: "admin",
          username: data.user.user_metadata?.username || email.split("@")[0],
          is_first_access: false,
        },
      ])
      .select()
      .single()
    if (createError) {
      throw new Error("Erro ao criar usuário admin no banco de dados.")
    }
    user = newUser
  }

  // Garantir que é admin
  if (user.role !== "admin") {
    throw new Error("Acesso restrito: apenas administradores podem acessar este painel.")
  }

  return convertToCamelCase<User>(user)
}

// Função para verificar autenticação atual
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null

  const userJson = localStorage.getItem("current_user")
  if (!userJson) return null

  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

// Função para salvar o usuário autenticado
export function setCurrentUser(user: User): void {
  if (typeof window === "undefined") return
  localStorage.setItem("current_user", JSON.stringify(user))
}

// Função para logout
export function logout(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("current_user")
}

// Função para verificar se um email já está registrado
export async function isEmailRegistered(email: string): Promise<boolean> {
  try {
    // Inicializar o banco de dados primeiro
    await initializeDb()

    const { data, error } = await supabase.from("users").select("id").eq("email", email).maybeSingle()

    if (error && error.code !== "PGRST116") {
      console.error("Erro ao verificar email registrado:", error)
      throw new Error("Erro ao verificar email. Tente novamente.")
    }

    return !!data
  } catch (error) {
    console.error("Erro em isEmailRegistered:", error)
    throw error
  }
}

// Função para obter o username de um email registrado
export async function getUsernameByEmail(email: string): Promise<string | null> {
  try {
    // Inicializar o banco de dados primeiro
    await initializeDb()

    const { data, error } = await supabase.from("users").select("username").eq("email", email).maybeSingle()

    if (error && error.code !== "PGRST116") {
      console.error("Erro ao buscar username por email:", error)
      return null
    }

    return data ? data.username : null
  } catch (error) {
    console.error("Erro em getUsernameByEmail:", error)
    return null
  }
}

// Função para recarregar dados do usuário do banco de dados
export async function refreshCurrentUser(): Promise<User | null> {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) return null

    // Buscar dados atualizados do banco
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", currentUser.id)
      .single()

    if (error) {
      console.error("Erro ao recarregar dados do usuário:", error)
      return currentUser // Retorna o usuário atual se houver erro
    }

    // Converter para camelCase e atualizar localStorage
    const updatedUser = convertToCamelCase<User>(data)
    setCurrentUser(updatedUser)
    
    return updatedUser
  } catch (error) {
    console.error("Erro em refreshCurrentUser:", error)
    return getCurrentUser() // Retorna o usuário atual se houver erro
  }
}

