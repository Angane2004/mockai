import { X, TrendingUp, Award, Calendar, BarChart3, Target, Clock, Zap, Brain } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface CandidateStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    userId: string;
    userName: string;
    userEmail: string;
    collegeName: string;
    currentYear: string;
    degree: string;
    branch: string;
    interviewCount: number;
    averageScore: number;
    lastInterview: string | Date;
    reports: any[];
  };
}

export const CandidateStatsModal = ({ isOpen, onClose, userData }: CandidateStatsModalProps) => {
  if (!isOpen) return null;

  // Calculate statistics
  const scores = userData.reports.map(r => r.overallRating).filter(s => s > 0);
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const avgScore = userData.averageScore;

  // Group scores by range for distribution
  const scoreDistribution = {
    excellent: scores.filter(s => s >= 8).length,
    good: scores.filter(s => s >= 6 && s < 8).length,
    average: scores.filter(s => s >= 4 && s < 6).length,
    poor: scores.filter(s => s < 4).length,
  };

  // Recent interview trend (last 5)
  const recentReports = userData.reports
    .sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt).getTime() - 
                     new Date(a.createdAt?.toDate?.() || a.createdAt).getTime())
    .slice(0, 5);

  // Additional statistics
  const improvementRate = recentReports.length >= 2 
    ? ((recentReports[0].overallRating - recentReports[recentReports.length - 1].overallRating) / recentReports[recentReports.length - 1].overallRating * 100)
    : 0;
  
  const consistencyScore = scores.length > 0 
    ? (10 - (Math.max(...scores) - Math.min(...scores))).toFixed(1)
    : 0;
  
  const passRate = ((scores.filter(s => s >= 6).length / scores.length) * 100).toFixed(0);
  
  const interviewTypes = userData.reports.reduce((acc: any, report: any) => {
    const type = report.interviewType || 'Technical';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  const mostCommonType = Object.entries(interviewTypes).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {userData.userName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{userData.userEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">College</p>
                  <p className="text-sm font-semibold">{userData.collegeName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Degree</p>
                  <p className="text-sm font-semibold">{userData.degree}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Branch</p>
                  <p className="text-sm font-semibold">{userData.branch}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Year</p>
                  <p className="text-sm font-semibold">{userData.currentYear}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Total Interviews</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{userData.interviewCount}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold">Average Score</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{avgScore.toFixed(1)}/10</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Best Score</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{maxScore.toFixed(1)}/10</p>
                  </div>
                  <Award className="h-8 w-8 text-purple-600 dark:text-purple-400 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Lowest Score</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{minScore > 0 ? minScore.toFixed(1) : 'N/A'}/10</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-amber-600 dark:text-amber-400 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Score Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Excellent (8-10)</span>
                    <span className="text-sm text-gray-600">{scoreDistribution.excellent} interviews</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(scoreDistribution.excellent / userData.interviewCount) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Good (6-7.9)</span>
                    <span className="text-sm text-gray-600">{scoreDistribution.good} interviews</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(scoreDistribution.good / userData.interviewCount) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Average (4-5.9)</span>
                    <span className="text-sm text-gray-600">{scoreDistribution.average} interviews</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(scoreDistribution.average / userData.interviewCount) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Needs Improvement (&lt;4)</span>
                    <span className="text-sm text-gray-600">{scoreDistribution.poor} interviews</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-red-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(scoreDistribution.poor / userData.interviewCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200 dark:border-cyan-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">Pass Rate</p>
                    <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{passRate}%</p>
                    <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">Score ≥ 6</p>
                  </div>
                  <Target className="h-8 w-8 text-cyan-600 dark:text-cyan-400 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Consistency</p>
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{consistencyScore}/10</p>
                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">Score stability</p>
                  </div>
                  <Clock className="h-8 w-8 text-indigo-600 dark:text-indigo-400 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Improvement</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {improvementRate > 0 ? '+' : ''}{improvementRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Recent trend</p>
                  </div>
                  <Zap className="h-8 w-8 text-emerald-600 dark:text-emerald-400 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold">Focus Area</p>
                    <p className="text-lg font-bold text-violet-700 dark:text-violet-300">{mostCommonType}</p>
                    <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1">Most practiced</p>
                  </div>
                  <Brain className="h-8 w-8 text-violet-600 dark:text-violet-400 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interview Types Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interview Types Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(interviewTypes).map(([type, count]: [string, any]) => (
                  <div key={type}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{type}</span>
                      <span className="text-sm text-gray-600">{count} interviews ({((count / userData.interviewCount) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${(count / userData.interviewCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Performance Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Performance Trend (Last 5 Interviews)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between h-48 gap-2">
                {recentReports.map((report, index) => {
                  const height = (report.overallRating / 10) * 100;
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500'];
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex items-end justify-center h-40">
                        <div 
                          className={`w-full ${colors[index % colors.length]} rounded-t-lg transition-all duration-500 flex items-end justify-center pb-2`}
                          style={{ height: `${height}%` }}
                        >
                          <span className="text-white text-xs font-bold">{report.overallRating.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">#{recentReports.length - index}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
