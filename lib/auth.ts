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
): Promise<User> {
  try {
    // Inicializar o banco de dados primeiro
    await initializeDb()

    // Verificar se é um login com email e username
    if (email && username && !firstName && !lastName) {
      try {
        const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single()

        if (error) {
          console.error("Erro ao buscar usuário por email:", error)
          throw new Error("Email não encontrado. Use a opção de primeiro acesso.")
        }

        if (user.username !== username) {
          throw new Error("User incorreto para este email.")
        }

        return convertToCamelCase<User>(user)
      } catch (error) {
        console.error("Erro ao autenticar com email e username:", error)
        throw error
      }
    }

    // Verificar se é um primeiro acesso ou criação de conta
    if (firstName && lastName && email) {
      if (!email.endsWith("@shopeemobile-external.com")) {
        throw new Error("Por favor, utilize seu email corporativo (@shopeemobile-external.com)")
      }

      try {
        // Verificar se o usuário já existe
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .maybeSingle()

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Erro ao verificar email existente:", checkError)
          throw new Error("Erro ao verificar email. Tente novamente.")
        }

        // Se o usuário não existe, criamos um novo
        if (!existingUser) {
          // Criar novo usuário
          const newUser = await createUser({
            firstName,
            lastName,
            email,
            role: "employee",
          })

          return newUser
        } else {
          // Se o usuário já existe, verificamos se o nome corresponde
          if (existingUser.first_name !== firstName || existingUser.last_name !== lastName) {
            throw new Error("Os dados informados não correspondem ao usuário cadastrado")
          }

          return convertToCamelCase<User>(existingUser)
        }
      } catch (error) {
        console.error("Erro ao verificar/criar usuário:", error)
        throw error
      }
    }

    throw new Error("Dados de autenticação incompletos")
  } catch (error) {
    console.error("Erro em authenticateEmployee:", error)
    throw error
  }
}

// Função para autenticar administrador
export async function authenticateAdmin(username: string, password: string): Promise<User> {
  // Hard-coded para o exemplo
  if (username !== "adminshopee" || password !== "adminhora") {
    throw new Error("Credenciais inválidas. Tente novamente.")
  }

  // Retornar um objeto de usuário admin sem acessar o banco de dados
  return {
    id: "admin",
    firstName: "Admin",
    lastName: "Shopee",
    email: "admin@shopee.com",
    role: "admin",
    username: "adminshopee",
    createdAt: new Date().toISOString(),
  }
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

