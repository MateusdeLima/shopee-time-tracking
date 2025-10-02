import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmployeeLoginForm } from "@/components/employee-login-form"
import { AdminLoginForm } from "@/components/admin-login-form"
import { DashboardLoginForm } from "@/components/dashboard-login-form"

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-4">
        <div className="flex justify-center mb-6">
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold text-[#EE4D2D]">Shopee Page Control</h1>
            <p className="text-xl text-gray-600">O controle da shopee external</p>
          </div>
        </div>
        <Tabs defaultValue="employee" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employee">Funcionário</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>
          <TabsContent value="employee">
            <Card>
              <CardHeader>
                <CardTitle>Login de Funcionário</CardTitle>
                <CardDescription>Entre com seus dados para registrar seu ponto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <EmployeeLoginForm />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Login de Administrador</CardTitle>
                <CardDescription>Acesse o painel administrativo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AdminLoginForm />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="dashboard">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Analytics</CardTitle>
                <CardDescription>Acesse o dashboard completo de análises</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DashboardLoginForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

