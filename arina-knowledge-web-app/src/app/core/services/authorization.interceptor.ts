import { HttpInterceptorFn } from '@angular/common/http';
import { AuthorizationService } from './authorization.service';
import { inject } from '@angular/core';
// import { inject } from '@angular/core';
// import { GithubService } from './github.service';

/*
export const AuthorizationInterceptor: HttpInterceptorFn = (req, next) => {
//   const githubService = inject(GithubService);
//   const token = githubService.userToken();

    if (req.url.includes('://github.com') || req.url.includes('://api.github.com')) {
        return next(req);
    }

    if (req.url.includes('://info.arina.network/api')) {
        const clonedWithCookies = req.clone({ withCredentials: true });
        return next(clonedWithCookies);
    }

//   // 2. If it's a direct request to GitHub's API, inject the Bearer Token instead
//   const isGitHubRequest = req.url.startsWith('https://github.com') || req.url.includes('github');
//   if (isGitHubRequest && token) {
//     const clonedWithGitHubToken = req.clone({
//       setHeaders: {
//         Authorization: `Bearer ${token}`,
//         Accept: 'application/vnd.github.v3+json'
//       }
//     });
//     return next(clonedWithGitHubToken);
//   }

  return next(req);
};

*/

export const AuthorizationInterceptor: HttpInterceptorFn = (req, next) => {
    const authorizationService = inject(AuthorizationService);
    const token = authorizationService.getToken();

    // 1. Target direct GitHub requests - only add header if token is populated
    if (req.url.includes('://github.com') || req.url.includes('://api.github.com') || req.url.includes('://://github.com')) {
        if (token) {
            const clonedWithGitHubToken = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });
            return next(clonedWithGitHubToken);
        }
    }

    // 2. Target your .NET backend - do NOT inject Authorization headers here
    if (req.url.includes('://info.arina.network/api')) {
        const clonedWithCookies = req.clone({ withCredentials: true });
        return next(clonedWithCookies);
    }

    return next(req);
};

/*

Your controller code is written perfectly! The use of [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)] is exactly right—it forces this specific endpoint to ignore the default global JWT setup and look directly at your GitHubSession cookies instead.If this exact code works perfectly in your TEST app but is still failing with a 302 Redirect in your main app, the issue is entirely down to the order of operations in your Startup.cs configuration.In ASP.NET Core, the order of middleware components matters. Here is how to fix the final missing puzzle piece in your backend configuration.🚨 Why it works on TEST but fails on MAINIn your main app's Startup.cs, your AddAuthorization FallbackPolicy dictates that an authenticated user is required for all requests by default.When a global fallback policy is active, it evaluates the request before it hits your controller's [Authorize] attribute schemes. Because your fallback policy checks the system's Default Challenge Scheme (which you set to JwtBearerDefaults.AuthenticationScheme), it throws a 302/401 challenge immediately because no JWT token exists, preventing the request from ever reading your controller's custom cookie rule.🛠️ The Final Backend FixTo fix this on your main application without breaking your global JWT fallback security, you need to add your Cookie scheme into your backend's default evaluation pool so it knows either a JWT or a Cookie is perfectly acceptable.Update your AddAuthentication block inside Startup.cs to explicitly include both schemes in your default authorization policy:csharp// Inside ConfigureServices in Startup.cs

// 1. Setup your Authentication Schemes
services
.AddAuthentication(options =>
{
    // Keep your defaults as JWT for standard API callers
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
{
    options.Cookie.Name = "GitHubSession";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always; // 👈 Ensure this is Always for cross-site transfers
    options.Cookie.SameSite = SameSiteMode.None;             // 👈 Ensure this is None for localhost dev
})
.AddJwtBearer(...)
.AddGitHub(...);

// 2. Update your Authorization to accept EITHER a valid JWT OR a valid Cookie session globally
services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
      // 👇 Explicitly allow the Fallback Policy to validate BOTH tracking types
      .AuthenticationSchemes.Add(JwtBearerDefaults.AuthenticationScheme)
      .AuthenticationSchemes.Add(CookieAuthenticationDefaults.AuthenticationScheme)
      .RequireAuthenticatedUser()
      .Build();
});
Use code with caution.🌟 Why this resolves the issue permanentlyBy adding .AuthenticationSchemes.Add(CookieAuthenticationDefaults.AuthenticationScheme) into your global fallback requirements, you are updating the security gate's rules.Now, when your Angular initialization code calls your backend with cookies attached, the global fallback policy inspects the cookies, notes that a valid session exists via the cookie scheme, satisfies the RequireAuthenticatedUser() rule, and passes the execution cleanly to your GitHubTokenController. Your controller then extracts the "github_access_token" claim and responds with your 200 OK JSON string.Deploy this adjustment to your authorization fallback configuration block, and your main application's authentication flow will operate smoothly.


*/