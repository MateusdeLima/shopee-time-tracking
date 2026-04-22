"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/database.types"
import { Loader2 } from "lucide-react"

type Project = Database["public"]["Tables"]["projects"]["Row"]

export function ProjectManagement() {
    const [projects, setProjects] = useState<Project[]>([])
    const [newProjectName, setNewProjectName] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch projects on mount
    useEffect(() => {
        fetchProjects()
    }, [])

    async function fetchProjects() {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from("projects")
                .select("*")
                .order("created_at", { ascending: false })

            if (error) {
                throw error
            }

            setProjects(data || [])
        } catch (error) {
            console.error("Error fetching projects:", error)
            toast({
                title: "Erro ao carregar projetos",
                description: "Não foi possível carregar a lista de projetos.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    async function handleCreateProject(e: React.FormEvent) {
        e.preventDefault()

        if (!newProjectName.trim()) {
            toast({
                title: "Nome inválido",
                description: "O nome do projeto não pode ser vazio.",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            // Check if project already exists
            const { data: existingProject } = await supabase
                .from("projects")
                .select("id")
                .eq("name", newProjectName.trim())
                .single()

            if (existingProject) {
                toast({
                    title: "Projeto já existe",
                    description: "Já existe um projeto com este nome.",
                    variant: "destructive",
                })
                return
            }

            const { data, error } = await supabase
                .from("projects")
                .insert([{ name: newProjectName.trim() }])
                .select()
                .single()

            if (error) {
                throw error
            }

            toast({
                title: "Projeto criado",
                description: `O projeto "${data.name}" foi criado com sucesso.`,
            })

            setNewProjectName("")
            fetchProjects() // Refresh list
        } catch (error: any) {
            console.error("Error creating project:", error)
            toast({
                title: "Erro ao criar projeto",
                description: error.message || "Não foi possível criar o projeto.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Novo Projeto</CardTitle>
                    <CardDescription>Crie um novo projeto para alocar agentes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateProject} className="flex gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="projectName">Nome do Projeto</Label>
                            <Input
                                type="text"
                                id="projectName"
                                placeholder="Ex: Projeto Shopee X"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting || !newProjectName.trim()}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                "Adicionar Projeto"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Projetos Existentes</CardTitle>
                    <CardDescription>Lista de todos os projetos cadastrados no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : projects.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum projeto cadastrado.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead className="text-right">Criado em</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.map((project) => (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-medium">{project.name}</TableCell>
                                        <TableCell className="text-right">
                                            {new Date(project.created_at).toLocaleDateString("pt-BR")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
