
package com.hospital.management;

import com.hospital.management.user.UserRepository;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(UserRepository repository) {
        return email -> repository.findByEmail(email.trim().toLowerCase())
                .map(user -> org.springframework.security.core.userdetails.User
                        .withUsername(user.getEmail())
                        .password(user.getPassword())
                        .roles(user.getRole().name())
                        .build())
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(userDetailsService);

        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            DaoAuthenticationProvider provider,
            SecurityContextRepository securityContextRepository)
            throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .securityContext(context -> {
                context.requireExplicitSave(true);
                context.securityContextRepository(securityContextRepository);
            })
            .authenticationProvider(provider)
            .authorizeHttpRequests(auth -> auth

                // Public authentication endpoints
                .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/logout").authenticated()

                // Admin-only endpoints
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Doctor-only and shared doctor endpoints
                .requestMatchers("/api/doctor/**")
                    .hasAnyRole("ADMIN", "DOCTOR")

                // Patient-specific endpoints
                .requestMatchers("/api/patient/**")
                    .hasAnyRole("ADMIN", "PATIENT")

                // View doctors: available to authenticated users
                .requestMatchers(HttpMethod.GET, "/api/doctors/**")
                    .hasAnyRole("ADMIN", "DOCTOR", "PATIENT")

                // Modify doctor records: admin only
                .requestMatchers("/api/doctors/**").hasRole("ADMIN")

                // View patient records: admin and doctor
                .requestMatchers(HttpMethod.GET, "/api/patients/**")
                    .hasAnyRole("ADMIN", "DOCTOR")

                // Modify patient records: admin only
                .requestMatchers("/api/patients/**").hasRole("ADMIN")

                // Appointment operations: authenticated users
                .requestMatchers("/api/appointments/**").authenticated()

                // Remaining endpoints
                .anyRequest().permitAll()
            )
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable());

        return http.build();
    }
}
