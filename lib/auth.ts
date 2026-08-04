import { createUser, getUserByEmail, getUserById, initializeDb, type User } from "./db"

// Função para autenticar funcionário
export async function authenticateEmployee(
  firstName?: string,
  lastName?: string,
  email?: string,
  username?: string,
  cpf?: string,
  birthDate?: string,
  profilePictureUrl?: string,
  shift?: "8-17" | "9-18"
): Promise<User> {
  try {
    await initializeDb()

    if (email) {
      const user = await getUserByEmail(email)

      if (!user) {
        throw new Error("E-mail não cadastrado. Entre em contato com o administrador.")
      }

      if (username) {
        if (user.username !== username) {
          throw new Error("ID incorreto para este e-mail.")
        }
        return user
      }

      if (user.isFirstAccess) {
        return user
      } else {
        throw new Error("Este e-mail já foi acessado. Por favor, insira seu ID.")
      }
    }

    throw new Error("Dados de autenticação incompletos")
  } catch (error) {
    console.error("Erro em authenticateEmployee:", error)
    throw error
  }
}

// Função para autenticar administrador
export async function authenticateAdmin(email: string, password?: string): Promise<User> {
  await initializeDb()

  if (!email || !email.trim()) {
    throw new Error("Por favor, digite o e-mail de administrador.")
  }

  const user = await getUserByEmail(email.trim())

  if (!user) {
    throw new Error("E-mail de administrador não encontrado no sistema.")
  }

  if (user.role !== "admin") {
    throw new Error("Acesso restrito: apenas administradores podem acessar este painel.")
  }

  if (!password || !password.trim()) {
    throw new Error("Por favor, digite a senha de acesso.")
  }

  const inputPassword = password.trim()
  const expectedPassword = (user.password || user.username || user.id).trim()

  if (inputPassword !== expectedPassword) {
    throw new Error("Senha incorreta. Por favor, digite a senha correta cadastrada para este e-mail.")
  }

  return user
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
    await initializeDb()
    const user = await getUserByEmail(email)
    return !!user
  } catch (error) {
    console.error("Erro em isEmailRegistered:", error)
    throw error
  }
}

// Função para obter o username de um email registrado
export async function getUsernameByEmail(email: string): Promise<string | null> {
  try {
    await initializeDb()
    const user = await getUserByEmail(email)
    return user ? user.username : null
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

    const updatedUser = await getUserById(currentUser.id)
    if (updatedUser) {
      setCurrentUser(updatedUser)
      return updatedUser
    }

    return currentUser
  } catch (error) {
    console.error("Erro em refreshCurrentUser:", error)
    return getCurrentUser()
  }
}
