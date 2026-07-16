'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus, Trash2, Edit, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { getEmployees, deleteEmployee } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { getDateLocale, useLocale } from '@/lib/locale'
import { toast } from '@/components/ui/use-toast'
import type { Employee } from '@/types'

export default function EmployeesPage() {
  const { locale } = useLocale()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const pageSize = 15
  const dateLocale = getDateLocale(locale)
  const copy = locale === 'th'
    ? {
        title: 'พนักงาน',
        totalEmployees: (count: number) => `${count} พนักงานทั้งหมด`,
        addEmployee: 'เพิ่มพนักงาน',
        searchPlaceholder: 'ค้นหาจากชื่อ รหัส อีเมล หรือตำแหน่ง…',
        emptyTitle: 'ไม่พบข้อมูลพนักงาน',
        emptySearch: 'ลองปรับคำค้นหาใหม่',
        emptyDefault: 'เริ่มต้นด้วยการเพิ่มพนักงานคนแรก',
        code: 'รหัส',
        name: 'ชื่อ',
        department: 'แผนก',
        position: 'ตำแหน่ง',
        shift: 'กะงาน',
        hireDate: 'วันที่เริ่มงาน',
        status: 'สถานะ',
        actions: 'การทำงาน',
        notAvailable: '—',
        editTitle: 'แก้ไขพนักงาน',
        deleteTitle: 'ลบพนักงาน',
        active: 'ใช้งาน',
        inactive: 'ไม่ใช้งาน',
        deletedToast: 'ลบพนักงานแล้ว',
        deletedDescription: (name: string) => `นำ ${name} ออกจากระบบเรียบร้อยแล้ว`,
        errorToast: 'เกิดข้อผิดพลาด',
        errorDescription: 'ลบพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        pageSummary: (page: number, totalPages: number, total: number) => `หน้า ${page} จาก ${totalPages} · ${total} พนักงาน`,
        deleteDialogTitle: 'ลบพนักงาน',
        deleteDialogDescription: (name: string, code: string) =>
          `คุณแน่ใจหรือไม่ว่าต้องการลบ ${name} (${code}) การกระทำนี้ไม่สามารถย้อนกลับได้ และจะลบข้อมูลเวลาเข้างานกับเงินเดือนที่เกี่ยวข้องทั้งหมด`,
        cancel: 'ยกเลิก',
        confirmDelete: 'ลบพนักงาน',
      }
    : {
        title: 'Employees',
        totalEmployees: (count: number) => `${count} total employees`,
        addEmployee: 'Add Employee',
        searchPlaceholder: 'Search by name, code, email or position…',
        emptyTitle: 'No employees found',
        emptySearch: 'Try adjusting your search terms.',
        emptyDefault: 'Start by adding your first employee.',
        code: 'Code',
        name: 'Name',
        department: 'Department',
        position: 'Position',
        shift: 'Shift',
        hireDate: 'Hire Date',
        status: 'Status',
        actions: 'Actions',
        notAvailable: '—',
        editTitle: 'Edit employee',
        deleteTitle: 'Delete employee',
        active: 'active',
        inactive: 'inactive',
        deletedToast: 'Employee deleted',
        deletedDescription: (name: string) => `${name} has been removed.`,
        errorToast: 'Error',
        errorDescription: 'Failed to delete employee. Please try again.',
        pageSummary: (page: number, totalPages: number, total: number) => `Page ${page} of ${totalPages} · ${total} employees`,
        deleteDialogTitle: 'Delete Employee',
        deleteDialogDescription: (name: string, code: string) =>
          `Are you sure you want to delete ${name} (${code})? This action cannot be undone and will remove all associated attendance and payroll records.`,
        cancel: 'Cancel',
        confirmDelete: 'Delete Employee',
      }

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getEmployees({ page, pageSize, search })
      setEmployees(response.data || [])
      setTotalPages(response.totalPages || 1)
      setTotal(response.total || 0)
    } catch {
      // Use mock data when API is unavailable
      const firstNames = ['Somchai', 'Malee', 'Niran', 'Pranee', 'Krit', 'Wassana', 'Thana', 'Siriporn', 'Wichai', 'Ladda']
      const lastNames  = ['Jaidee', 'Sombat', 'Pongpan', 'Charoen', 'Manee', 'Yodsak', 'Phon', 'Rung', 'Chan', 'Dee']
      const positions  = locale === 'th'
        ? ['นักพัฒนาอาวุโส', 'ผู้จัดการ HR', 'นักบัญชี', 'นักพัฒนา', 'เจ้าหน้าที่ HR']
        : ['Senior Developer', 'HR Manager', 'Accountant', 'Developer', 'HR Officer']
      const deptNames  = locale === 'th' ? ['วิศวกรรม', 'ทรัพยากรบุคคล', 'การเงิน'] : ['Engineering', 'HR', 'Finance']
      const deptCodes  = ['ENG', 'HR', 'FIN']

      const mockData: Employee[] = Array.from({ length: 10 }, (_, i) => {
        const deptIdx = i % 3
        return {
          id: `emp-${i + 1}`,
          employeeCode: `EMP${String(i + 1).padStart(4, '0')}`,
          firstName: firstNames[i],
          lastName: lastNames[i],
          fullName: `${firstNames[i]} ${lastNames[i]}`,
          email: `employee${i + 1}@company.com`,
          phone: `08${String(i + 1).padStart(8, '0')}`,
          departmentId: `dept-${deptIdx + 1}`,
          department: {
            id: `dept-${deptIdx + 1}`,
            name: deptNames[deptIdx],
            code: deptCodes[deptIdx],
            headCount: 30,
          },
          shiftId: 'shift-1',
          shift: {
            id: 'shift-1',
            name: 'Morning',
            code: 'MOR',
            startTime: '08:00',
            endTime: '17:00',
            workingHours: 8,
            graceMinutes: 15,
          },
          position: positions[i % 5],
          hireDate: `202${Math.floor(i / 3)}-0${(i % 9) + 1}-01`,
          status: i < 8 ? 'active' : 'inactive',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      })

      setEmployees(mockData)
      setTotalPages(3)
      setTotal(30)
    } finally {
      setIsLoading(false)
    }
  }, [locale, page, search])

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300)
    return () => clearTimeout(timer)
  }, [fetchEmployees])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteEmployee(deleteTarget.id)
      const employeeName = deleteTarget.fullName || `${deleteTarget.firstName} ${deleteTarget.lastName}`
      toast({
        title: copy.deletedToast,
        description: copy.deletedDescription(employeeName),
        variant: 'default',
      })
      setDeleteTarget(null)
      fetchEmployees()
    } catch {
      toast({
        title: copy.errorToast,
        description: copy.errorDescription,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{copy.title}</h2>
            <p className="text-slate-400 text-sm mt-0.5">{copy.totalEmployees(total)}</p>
          </div>
        </div>
        <Link href="/employees/new">
          <Button id="add-employee-btn">
            <Plus className="h-4 w-4" />
            {copy.addEmployee}
          </Button>
        </Link>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="employee-search"
                type="text"
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-white/5 rounded-lg shimmer" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-slate-500" />
              </div>
              <p className="text-white font-medium">{copy.emptyTitle}</p>
              <p className="text-slate-500 text-sm mt-1">
                {search ? copy.emptySearch : copy.emptyDefault}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.code}</TableHead>
                  <TableHead>{copy.name}</TableHead>
                  <TableHead>{copy.department}</TableHead>
                  <TableHead>{copy.position}</TableHead>
                  <TableHead>{copy.shift}</TableHead>
                  <TableHead>{copy.hireDate}</TableHead>
                  <TableHead>{copy.status}</TableHead>
                  <TableHead className="text-right">{copy.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs text-slate-400">
                      {emp.employeeCode}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white leading-tight">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-slate-400 leading-tight">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-slate-300 text-sm">
                        {emp.department?.name || copy.notAvailable}
                      </span>
                    </TableCell>

                    <TableCell className="text-slate-300 text-sm">{emp.position}</TableCell>

                    <TableCell>
                      <span className="text-slate-300 text-sm">
                        {emp.shift?.name || copy.notAvailable}
                      </span>
                    </TableCell>

                    <TableCell className="text-slate-300 text-sm whitespace-nowrap">
                      {formatDate(emp.hireDate, dateLocale)}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          emp.status === 'active'
                            ? 'success'
                            : emp.status === 'inactive'
                            ? 'warning'
                            : 'destructive'
                        }
                      >
                        {emp.status === 'active' ? copy.active : emp.status === 'inactive' ? copy.inactive : emp.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/employees/${emp.id}/edit`}>
                          <button
                            title={copy.editTitle}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 border border-white/5 flex items-center justify-center text-slate-400 transition-all duration-150"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                        <button
                          title={copy.deleteTitle}
                          onClick={() => setDeleteTarget(emp)}
                          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/5 flex items-center justify-center text-slate-400 transition-all duration-150"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!isLoading && employees.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.04]">
              <p className="text-sm text-slate-400">
                {copy.pageSummary(page, totalPages, total)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  id="prev-page-btn"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page number pills */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                        pageNum === page
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  id="next-page-btn"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <DialogTitle>{copy.deleteDialogTitle}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? copy.deleteDialogDescription(
                    `${deleteTarget.firstName} ${deleteTarget.lastName}`,
                    deleteTarget.employeeCode || '-'
                  )
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              {copy.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              isLoading={isDeleting}
              id="confirm-delete-btn"
            >
              {copy.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
