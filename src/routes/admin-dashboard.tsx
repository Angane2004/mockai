import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/config/firebase.config";
import { collection, getDocs, query, where, deleteDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { InterviewReport } from "@/types";
import { toast } from "sonner";
import { Users, TrendingUp, Award, Trash2, Search, GraduationCap, BarChart3, Filter, Eye, KeyRound } from "lucide-react";
import { sendAccountDeletionEmail } from "@/services/email-service";
import { CandidateStatsModal } from "@/components/candidate-stats-modal";

interface UserStats {
  totalUsers: number;
  totalInterviews: number;
  activeUsers: number;
  averageScore: number;
}

interface UserData {
  userId: string;
  userName: string;
  userEmail: string;
  collegeName: string;
  currentYear: string;
  degree: string;
  branch: string;
  interviewCount: number;
  averageScore: number;
  lastInterview: string;
  reports: InterviewReport[];
}

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    totalInterviews: 0,
    activeUsers: 0,
    averageScore: 0,
  });
  const [userData, setUserData] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [deleteReason, setDeleteReason] = useState("");
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const isAdmin = localStorage.getItem("adminSession");
    if (!isAdmin) {
      navigate("/admin-signin");
      return;
    }

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get all user profiles
      const profilesSnapshot = await getDocs(collection(db, "userProfiles"));
      const profiles = new Map<string, any>();
      profilesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        profiles.set(data.userId, data);
      });
      
      // Get all interview reports
      const reportsSnapshot = await getDocs(collection(db, "interviewReports"));
      const reports = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Group reports by user
      const userReportsMap = new Map<string, any[]>();
      reports.forEach((report: any) => {
        if (!userReportsMap.has(report.userId)) {
          userReportsMap.set(report.userId, []);
        }
        userReportsMap.get(report.userId)!.push(report);
      });
      
      // Build comprehensive user data
      const usersData: UserData[] = [];
      let totalScore = 0;
      let scoreCount = 0;
      
      profiles.forEach((profile, userId) => {
        const userReports = userReportsMap.get(userId) || [];
        const scores = userReports.map((r: any) => r.overallRating).filter((s: number) => s > 0);
        const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        
        if (avgScore > 0) {
          totalScore += avgScore;
          scoreCount++;
        }
        
        const lastReport = userReports.sort((a: any, b: any) => 
          new Date(b.createdAt?.toDate?.() || b.createdAt).getTime() - 
          new Date(a.createdAt?.toDate?.() || a.createdAt).getTime()
        )[0];
        
        usersData.push({
          userId,
          userName: profile.userName || "Unknown",
          userEmail: profile.userEmail || "",
          collegeName: profile.collegeName || "N/A",
          currentYear: profile.currentYear || "N/A",
          degree: profile.degree || "N/A",
          branch: profile.branch || "N/A",
          interviewCount: userReports.length,
          averageScore: avgScore,
          lastInterview: lastReport?.createdAt?.toDate?.() || lastReport?.createdAt || new Date(),
          reports: userReports,
        });
      });
      
      // Calculate statistics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeUsers = usersData.filter(u => 
        new Date(u.lastInterview) > thirtyDaysAgo
      ).length;
      
      setStats({
        totalUsers: usersData.length,
        totalInterviews: reports.length,
        activeUsers,
        averageScore: scoreCount > 0 ? totalScore / scoreCount : 0,
      });
      
      setUserData(usersData.sort((a, b) => b.interviewCount - a.interviewCount));
      setFilteredUsers(usersData.sort((a, b) => b.interviewCount - a.interviewCount));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = userData;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.collegeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply college filter
    if (filterCollege !== "all") {
      filtered = filtered.filter(u => u.collegeName === filterCollege);
    }
    
    // Apply year filter
    if (filterYear !== "all") {
      filtered = filtered.filter(u => u.currentYear === filterYear);
    }
    
    setFilteredUsers(filtered);
  }, [searchTerm, filterCollege, filterYear, userData]);
  
  const handleDeleteUser = async () => {
    if (!userToDelete || !deleteReason.trim()) {
      toast.error("Please provide a reason for deletion");
      return;
    }
    
    try {
      // Store deletion record
      await addDoc(collection(db, "deletedUsers"), {
        userId: userToDelete.userId,
        userName: userToDelete.userName,
        userEmail: userToDelete.userEmail,
        collegeName: userToDelete.collegeName,
        deletedBy: user?.id || "admin",
        reason: deleteReason,
        deletedAt: serverTimestamp(),
      });
      
      // Delete user profile
      const profileQuery = query(
        collection(db, "userProfiles"),
        where("userId", "==", userToDelete.userId)
      );
      const profileSnapshot = await getDocs(profileQuery);
      for (const docSnap of profileSnapshot.docs) {
        await deleteDoc(doc(db, "userProfiles", docSnap.id));
      }
      
      // Send email notification
      const emailSent = await sendAccountDeletionEmail({
        userEmail: userToDelete.userEmail,
        userName: userToDelete.userName,
        reason: deleteReason,
      });
      
      if (emailSent) {
        toast.success(`User ${userToDelete.userName} has been deleted and notified via email`);
      } else {
        toast.success(`User ${userToDelete.userName} has been deleted (email notification failed)`);
      }
      setShowDeleteModal(false);
      setUserToDelete(null);
      setDeleteReason("");
      
      // Reload data
      loadDashboardData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem("adminSession");
    navigate("/");
  };
  
  // Get unique colleges and years for dropdowns
  const uniqueColleges = Array.from(new Set(userData.map(u => u.collegeName)));
  const uniqueYears = Array.from(new Set(userData.map(u => u.currentYear)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl sm:text-2xl">
          {loading && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
                    <div className="relative">
                      {/* Outer rotating ring */}
                      <div className="absolute inset-0 w-24 h-24">
                        <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
                      </div>
                      {/* Middle rotating ring */}
                      <div className="absolute inset-2 w-20 h-20">
                        <div className="absolute inset-0 border-4 border-transparent border-b-purple-500 border-l-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                      </div>
                      {/* Inner pulsing circle */}
                      <div className="absolute inset-4 w-16 h-16">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                      </div>
                      {/* Center icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <KeyRound className="h-8 w-8 text-white z-10" />
                      </div>
                    </div>
                  </div>
                )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-4 sm:p-6 lg:p-8" 
      style={{
        backgroundImage: 'url(/assets/img/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Welcome back, {user?.firstName || "Admin"}</p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto">
            Logout
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.totalUsers}</div>
              <p className="text-xs text-blue-600 mt-1">Registered users</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
              <BarChart3 className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-green-700">{stats.totalInterviews}</div>
              <p className="text-xs text-green-600 mt-1">Completed interviews</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-purple-700">{stats.activeUsers}</div>
              <p className="text-xs text-purple-600 mt-1">Last 30 days</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <Award className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-orange-700">{stats.averageScore.toFixed(1)}/10</div>
              <p className="text-xs text-orange-600 mt-1">Platform average</p>
            </CardContent>
          </Card>
        </div>

        {/* Total Users Statistics Graph */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Platform Analytics Overview
            </CardTitle>
            <CardDescription>Comprehensive user and performance statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Distribution by College */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Users by College</h3>
                <div className="space-y-3">
                  {uniqueColleges.slice(0, 5).map(college => {
                    const count = userData.filter(u => u.collegeName === college).length;
                    const percentage = (count / stats.totalUsers) * 100;
                    return (
                      <div key={college}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium truncate max-w-[200px]">{college}</span>
                          <span className="text-xs text-gray-600">{count} users ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Distribution by Year */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Users by Academic Year</h3>
                <div className="flex items-end justify-between h-40 gap-2">
                  {uniqueYears.sort().map((year, index) => {
                    const count = userData.filter(u => u.currentYear === year).length;
                    const height = (count / stats.totalUsers) * 100;
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                    return (
                      <div key={year} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex items-end justify-center h-32">
                          <div 
                            className={`w-full ${colors[index % colors.length]} rounded-t-lg transition-all duration-500 flex items-end justify-center pb-1`}
                            style={{ height: `${height}%`, minHeight: '20px' }}
                          >
                            <span className="text-white text-xs font-bold">{count}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 font-medium">{year}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Performance Distribution */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Performance Distribution</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Excellent (8-10)', min: 8, max: 10, color: 'bg-green-500' },
                    { label: 'Good (6-7.9)', min: 6, max: 8, color: 'bg-blue-500' },
                    { label: 'Average (4-5.9)', min: 4, max: 6, color: 'bg-yellow-500' },
                    { label: 'Needs Improvement (<4)', min: 0, max: 4, color: 'bg-red-500' },
                  ].map(range => {
                    const count = userData.filter(u => u.averageScore >= range.min && u.averageScore < range.max).length;
                    const percentage = (count / stats.totalUsers) * 100;
                    return (
                      <div key={range.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium">{range.label}</span>
                          <span className="text-xs text-gray-600">{count} users ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${range.color} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interview Activity */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Interview Activity Distribution</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Highly Active (10+ interviews)', min: 10, color: 'bg-purple-500' },
                    { label: 'Active (5-9 interviews)', min: 5, max: 10, color: 'bg-blue-500' },
                    { label: 'Moderate (2-4 interviews)', min: 2, max: 5, color: 'bg-green-500' },
                    { label: 'New Users (1 interview)', min: 1, max: 2, color: 'bg-orange-500' },
                  ].map(range => {
                    const count = userData.filter(u => 
                      range.max ? (u.interviewCount >= range.min && u.interviewCount < range.max) : u.interviewCount >= range.min
                    ).length;
                    const percentage = (count / stats.totalUsers) * 100;
                    return (
                      <div key={range.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium">{range.label}</span>
                          <span className="text-xs text-gray-600">{count} users ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${range.color} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Label>
                <Input
                  placeholder="Search by name, email, or college..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  College
                </Label>
                <select
                  value={filterCollege}
                  onChange={(e) => setFilterCollege(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">All Colleges</option>
                  {uniqueColleges.map(college => (
                    <option key={college} value={college}>{college}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-2">Year</Label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">All Years</option>
                  {uniqueYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage all platform users ({filteredUsers.length} users shown)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((userData) => (
                <Card key={userData.userId} className="overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="text-base sm:text-lg font-bold">{userData.userName}</h3>
                          <span className="text-xs sm:text-sm text-gray-500">{userData.userEmail}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-blue-600" />
                            <span>{userData.collegeName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Year:</span>
                            <span>{userData.currentYear}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Degree:</span>
                            <span>{userData.degree} - {userData.branch}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Interviews:</span>
                            <span className="text-blue-600 font-semibold">{userData.interviewCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(userData);
                            setShowStatsModal(true);
                          }}
                          className="w-full sm:w-auto"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">View Stats</span>
                          <span className="sm:hidden">Stats</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(userData);
                            setShowDeleteModal(true);
                          }}
                          className="w-full sm:w-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Average Performance Score</span>
                        <span className="font-bold text-lg">{userData.averageScore.toFixed(1)}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            userData.averageScore >= 8 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                            userData.averageScore >= 6 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            'bg-gradient-to-r from-red-400 to-red-600'
                          }`}
                          style={{ width: `${(userData.averageScore / 10) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Last Interview: {new Date(userData.lastInterview).toLocaleDateString()}</span>
                        <span>
                          {userData.averageScore >= 8 ? '🏆 Excellent' :
                           userData.averageScore >= 6 ? '👍 Good' : '💪 Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No users found matching your criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delete User Modal */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="bg-red-50">
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Delete User Account
                </CardTitle>
                <CardDescription>
                  This action cannot be undone. The user will receive an email notification.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">{userToDelete.userName}</p>
                  <p className="text-sm text-gray-600">{userToDelete.userEmail}</p>
                  <p className="text-sm text-gray-600">{userToDelete.collegeName}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deleteReason" className="font-semibold">
                    Reason for Deletion <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="deleteReason"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="e.g., Account abusing platform, Not taking interviews seriously, Inappropriate behavior"
                    className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                    required
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setUserToDelete(null);
                      setDeleteReason("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteUser}
                    className="flex-1"
                    disabled={!deleteReason.trim()}
                  >
                    Delete User
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Candidate Stats Modal */}
        {selectedUser && (
          <CandidateStatsModal
            isOpen={showStatsModal}
            onClose={() => {
              setShowStatsModal(false);
              setSelectedUser(null);
            }}
            userData={selectedUser}
          />
        )}
      </div>
    </div>
  );
};
