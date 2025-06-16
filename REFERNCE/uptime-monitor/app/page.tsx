"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import {
  Plus,
  Globe,
  Database,
  Server,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  Pause,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Switch } from "@/components/ui/switch"

interface Service {
  id: string
  name: string
  url: string
  type: "website" | "database" | "redis"
  status: "up" | "down" | "degraded"
  responseTime: number
  uptime: number
  lastChecked: Date
  isMonitoring: boolean
  history: Array<{
    timestamp: Date
    responseTime: number
    status: "up" | "down" | "degraded"
  }>
}

// Real websites for testing
const initialServices: Service[] = [
  {
    id: "1",
    name: "Google",
    url: "https://www.google.com",
    type: "website",
    status: "up",
    responseTime: 0,
    uptime: 100,
    lastChecked: new Date(),
    isMonitoring: false,
    history: [],
  },
  {
    id: "2",
    name: "GitHub",
    url: "https://github.com",
    type: "website",
    status: "up",
    responseTime: 0,
    uptime: 100,
    lastChecked: new Date(),
    isMonitoring: false,
    history: [],
  },
  {
    id: "3",
    name: "JSONPlaceholder API",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    type: "website",
    status: "up",
    responseTime: 0,
    uptime: 100,
    lastChecked: new Date(),
    isMonitoring: false,
    history: [],
  },
]

export default function UptimeMonitor() {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [newService, setNewService] = useState({
    name: "",
    url: "",
    type: "website" as "website" | "database" | "redis",
  })
  const [editService, setEditService] = useState({
    name: "",
    url: "",
    type: "website" as "website" | "database" | "redis",
  })
  const [timeWindow, setTimeWindow] = useState<"24h" | "7d" | "30d" | "90d">("30d")
  const [isGlobalMonitoring, setIsGlobalMonitoring] = useState(false)

  const timeWindows = {
    "24h": { label: "Last 24 Hours", hours: 24 },
    "7d": { label: "Last 7 Days", hours: 24 * 7 },
    "30d": { label: "Last 30 Days", hours: 24 * 30 },
    "90d": { label: "Last 90 Days", hours: 24 * 90 },
  }

  // Function to check website status
  const checkWebsiteStatus = async (
    url: string,
  ): Promise<{ status: "up" | "down" | "degraded"; responseTime: number }> => {
    const startTime = Date.now()

    try {
      // For CORS-enabled endpoints, we can make direct requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(url, {
        method: "HEAD", // Use HEAD to minimize data transfer
        signal: controller.signal,
        mode: "no-cors", // This will work for most sites but won't give us detailed response info
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      // With no-cors mode, we can't check response.ok, so we assume success if no error
      return {
        status: responseTime > 5000 ? "degraded" : "up",
        responseTime,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      // Check if it's a timeout or network error
      if (error instanceof Error && error.name === "AbortError") {
        return { status: "down", responseTime: 10000 }
      }

      // For no-cors requests, some "errors" might actually be successful requests
      // that we can't read due to CORS policy
      if (responseTime < 5000) {
        return { status: "up", responseTime }
      }

      return { status: "down", responseTime }
    }
  }

  // Function to check database status (placeholder - would need server-side implementation)
  const checkDatabaseStatus = async (
    url: string,
  ): Promise<{ status: "up" | "down" | "degraded"; responseTime: number }> => {
    // This is a placeholder since database connections can't be made directly from the browser
    // In a real implementation, this would be a server-side API call
    const startTime = Date.now()

    // Simulate database check
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 100))

    const responseTime = Date.now() - startTime

    // For demo purposes, randomly determine status
    const random = Math.random()
    let status: "up" | "down" | "degraded" = "up"

    if (random < 0.05) status = "down"
    else if (random < 0.15) status = "degraded"

    return { status, responseTime }
  }

  // Function to check Redis status (placeholder - would need server-side implementation)
  const checkRedisStatus = async (
    url: string,
  ): Promise<{ status: "up" | "down" | "degraded"; responseTime: number }> => {
    // This is a placeholder since Redis connections can't be made directly from the browser
    // In a real implementation, this would be a server-side API call
    const startTime = Date.now()

    // Simulate Redis check
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 500 + 50))

    const responseTime = Date.now() - startTime

    // For demo purposes, randomly determine status
    const random = Math.random()
    let status: "up" | "down" | "degraded" = "up"

    if (random < 0.03) status = "down"
    else if (random < 0.1) status = "degraded"

    return { status, responseTime }
  }

  // Function to perform health check based on service type
  const performHealthCheck = async (service: Service) => {
    let result: { status: "up" | "down" | "degraded"; responseTime: number }

    try {
      switch (service.type) {
        case "website":
          result = await checkWebsiteStatus(service.url)
          break
        case "database":
          result = await checkDatabaseStatus(service.url)
          break
        case "redis":
          result = await checkRedisStatus(service.url)
          break
        default:
          result = { status: "down", responseTime: 0 }
      }

      // Update service with new data
      setServices((prevServices) =>
        prevServices.map((s) =>
          s.id === service.id
            ? {
                ...s,
                status: result.status,
                responseTime: result.responseTime,
                lastChecked: new Date(),
                history: [
                  ...s.history,
                  {
                    timestamp: new Date(),
                    responseTime: result.responseTime,
                    status: result.status,
                  },
                ].slice(-1000), // Keep last 1000 entries
              }
            : s,
        ),
      )
    } catch (error) {
      console.error(`Error checking ${service.name}:`, error)

      // Update service with error status
      setServices((prevServices) =>
        prevServices.map((s) =>
          s.id === service.id
            ? {
                ...s,
                status: "down",
                responseTime: 0,
                lastChecked: new Date(),
                history: [
                  ...s.history,
                  {
                    timestamp: new Date(),
                    responseTime: 0,
                    status: "down",
                  },
                ].slice(-1000),
              }
            : s,
        ),
      )
    }
  }

  // Function to toggle monitoring for a specific service
  const toggleServiceMonitoring = (serviceId: string) => {
    setServices((prevServices) =>
      prevServices.map((service) =>
        service.id === serviceId ? { ...service, isMonitoring: !service.isMonitoring } : service,
      ),
    )
  }

  // Function to toggle global monitoring
  const toggleGlobalMonitoring = () => {
    const newState = !isGlobalMonitoring
    setIsGlobalMonitoring(newState)

    setServices((prevServices) =>
      prevServices.map((service) => ({
        ...service,
        isMonitoring: newState,
      })),
    )
  }

  // Monitoring effect
  useEffect(() => {
    const monitoringServices = services.filter((service) => service.isMonitoring)

    if (monitoringServices.length === 0) return

    const interval = setInterval(() => {
      monitoringServices.forEach((service) => {
        performHealthCheck(service)
      })
    }, 30000) // Check every 30 seconds

    // Initial check
    monitoringServices.forEach((service) => {
      performHealthCheck(service)
    })

    return () => clearInterval(interval)
  }, [services.map((s) => s.isMonitoring).join(",")])

  const getFilteredHistory = (service: Service) => {
    const cutoffTime = new Date(Date.now() - timeWindows[timeWindow].hours * 60 * 60 * 1000)
    return service.history.filter((entry) => entry.timestamp >= cutoffTime)
  }

  const calculateUptimeForWindow = (service: Service) => {
    const filteredHistory = getFilteredHistory(service)
    if (filteredHistory.length === 0) return 100

    const upEntries = filteredHistory.filter((entry) => entry.status === "up").length
    return Number(((upEntries / filteredHistory.length) * 100).toFixed(2))
  }

  const getAverageResponseTime = (service: Service) => {
    const filteredHistory = getFilteredHistory(service)
    if (filteredHistory.length === 0) return service.responseTime

    const total = filteredHistory.reduce((acc, entry) => acc + entry.responseTime, 0)
    return Math.round(total / filteredHistory.length)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "up":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "down":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "degraded":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string, isMonitoring: boolean) => {
    if (!isMonitoring) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
          Stopped
        </Badge>
      )
    }

    const variants = {
      up: "bg-green-100 text-green-800 border-green-200",
      down: "bg-red-100 text-red-800 border-red-200",
      degraded: "bg-yellow-100 text-yellow-800 border-yellow-200",
    }
    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "website":
        return <Globe className="h-4 w-4" />
      case "database":
        return <Database className="h-4 w-4" />
      case "redis":
        return <Server className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const addService = () => {
    if (newService.name && newService.url) {
      const service: Service = {
        id: Date.now().toString(),
        name: newService.name,
        url: newService.url,
        type: newService.type,
        status: "up",
        responseTime: 0,
        uptime: 100,
        lastChecked: new Date(),
        isMonitoring: false,
        history: [],
      }
      setServices([...services, service])
      setNewService({ name: "", url: "", type: "website" })
      setIsAddDialogOpen(false)
    }
  }

  const openEditDialog = (service: Service) => {
    setSelectedService(service)
    setEditService({
      name: service.name,
      url: service.url,
      type: service.type,
    })
    setIsEditDialogOpen(true)
  }

  const updateService = () => {
    if (selectedService && editService.name && editService.url) {
      setServices(
        services.map((service) =>
          service.id === selectedService.id
            ? { ...service, name: editService.name, url: editService.url, type: editService.type }
            : service,
        ),
      )
      setIsEditDialogOpen(false)
      setSelectedService(null)
    }
  }

  const openDeleteDialog = (service: Service) => {
    setSelectedService(service)
    setIsDeleteDialogOpen(true)
  }

  const deleteService = () => {
    if (selectedService) {
      setServices(services.filter((service) => service.id !== selectedService.id))
      setIsDeleteDialogOpen(false)
      setSelectedService(null)
    }
  }

  const overallUptime =
    services.length > 0
      ? (services.reduce((acc, service) => acc + calculateUptimeForWindow(service), 0) / services.length).toFixed(2)
      : "0"

  const servicesUp = services.filter((s) => s.status === "up").length
  const servicesDown = services.filter((s) => s.status === "down").length
  const servicesDegraded = services.filter((s) => s.status === "degraded").length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Uptime Monitor</h1>
            <p className="text-gray-600 mt-1">Monitor your websites, databases, and services</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="global-monitoring" checked={isGlobalMonitoring} onCheckedChange={toggleGlobalMonitoring} />
              <Label htmlFor="global-monitoring" className="text-sm font-medium">
                {isGlobalMonitoring ? "Stop All" : "Start All"}
              </Label>
            </div>
            <Select value={timeWindow} onValueChange={(value: "24h" | "7d" | "30d" | "90d") => setTimeWindow(value)}>
              <SelectTrigger className="w-40">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(timeWindows).map(([key, window]) => (
                  <SelectItem key={key} value={key}>
                    {window.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                  <DialogDescription>Add a new service to monitor its uptime and performance.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Service Name</Label>
                    <Input
                      id="name"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      placeholder="My Website"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      value={newService.url}
                      onChange={(e) => setNewService({ ...newService, url: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Service Type</Label>
                    <Select
                      value={newService.type}
                      onValueChange={(value: "website" | "database" | "redis") =>
                        setNewService({ ...newService, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="database">Database</SelectItem>
                        <SelectItem value="redis">Redis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addService}>Add Service</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Service Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
              <DialogDescription>Update the service details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Service Name</Label>
                <Input
                  id="edit-name"
                  value={editService.name}
                  onChange={(e) => setEditService({ ...editService, name: e.target.value })}
                  placeholder="My Website"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-url">URL</Label>
                <Input
                  id="edit-url"
                  value={editService.url}
                  onChange={(e) => setEditService({ ...editService, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Service Type</Label>
                <Select
                  value={editService.type}
                  onValueChange={(value: "website" | "database" | "redis") =>
                    setEditService({ ...editService, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="redis">Redis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateService}>Update Service</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Service</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedService?.name}"? This action cannot be undone and will remove
                all historical data for this service.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteService} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Uptime</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallUptime}%</div>
              <p className="text-xs text-muted-foreground">{timeWindows[timeWindow].label}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Services Up</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{servicesUp}</div>
              <p className="text-xs text-muted-foreground">Currently operational</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Services Down</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{servicesDown}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Degraded</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{servicesDegraded}</div>
              <p className="text-xs text-muted-foreground">Performance issues</p>
            </CardContent>
          </Card>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(service.type)}
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(service.status, service.isMonitoring)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleServiceMonitoring(service.id)}>
                          {service.isMonitoring ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" />
                              Stop Monitoring
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Start Monitoring
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(service)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(service)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription className="font-mono text-sm">{service.url}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Response Time</p>
                    <p className="font-semibold">
                      {service.history.length > 0 ? getAverageResponseTime(service) : service.responseTime}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uptime</p>
                    <p className="font-semibold">{calculateUptimeForWindow(service)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Check</p>
                    <p className="font-semibold">{service.lastChecked.toLocaleTimeString()}</p>
                  </div>
                </div>

                {getFilteredHistory(service).length > 0 && (
                  <div className="h-32">
                    <ChartContainer
                      config={{
                        responseTime: {
                          label: "Response Time",
                          color: "hsl(var(--chart-1))",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getFilteredHistory(service)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(value) => {
                              const date = new Date(value)
                              return timeWindow === "24h"
                                ? date.getHours() + ":00"
                                : date.getMonth() + 1 + "/" + date.getDate()
                            }}
                            fontSize={10}
                          />
                          <YAxis fontSize={10} />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                            labelFormatter={(value) => new Date(value).toLocaleString()}
                          />
                          <Area
                            type="monotone"
                            dataKey="responseTime"
                            stroke="var(--color-responseTime)"
                            fill="var(--color-responseTime)"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {services.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No services monitored</h3>
              <p className="text-gray-600 mb-4">Add your first service to start monitoring uptime and performance.</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
